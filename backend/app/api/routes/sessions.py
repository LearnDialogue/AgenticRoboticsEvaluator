"""Session and chat routes for students."""

import logging
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func

from app.api.deps import DBSession, CurrentUser
from app.models.session import Session as ChatSession, SessionStatus
from app.models.message import Message, MessageRole
from app.schemas.session import SessionRead, SessionList
from app.schemas.message import MessageRead, ChatRequest, ChatResponse
from app.services.flow_engine import FlowEngine
from app.services.llm_client import get_llm_client
from app.services.session_evaluator import evaluate_session
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("", response_model=SessionRead, status_code=status.HTTP_201_CREATED)
def create_session(
    db: DBSession,
    current_user: CurrentUser,
) -> ChatSession:
    """
    Create a new chat session for the current user.
    """
    session = ChatSession(
        student_id=current_user.id,
        status=SessionStatus.ACTIVE,
        current_stage="greeting",
        prompt_version="v1.0",
        model_name=settings.LLM_MODEL,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return session


@router.get("", response_model=SessionList)
def list_my_sessions(
    db: DBSession,
    current_user: CurrentUser,
    page: int = 1,
    page_size: int = 20,
) -> SessionList:
    """
    List current user's sessions.
    """
    offset = (page - 1) * page_size

    query = db.query(ChatSession).filter(ChatSession.student_id == current_user.id)

    total = query.count()
    sessions = (
        query.order_by(ChatSession.started_at.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )

    return SessionList(
        items=[SessionRead.model_validate(s) for s in sessions],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{session_id}", response_model=SessionRead)
def get_session(
    session_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> ChatSession:
    """
    Get a specific session (must own it or be admin).
    """
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    # Check ownership (admin check handled separately via role)
    if session.student_id != current_user.id and current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this session",
        )

    return session


@router.get("/{session_id}/messages", response_model=list[MessageRead])
def get_session_messages(
    session_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> list[Message]:
    """
    Get all messages for a session.
    """
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    if session.student_id != current_user.id and current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this session",
        )

    messages = (
        db.query(Message)
        .filter(Message.session_id == session_id)
        .order_by(Message.created_at.asc())
        .all()
    )

    return messages


@router.post("/{session_id}/chat", response_model=ChatResponse)
async def chat(
    session_id: UUID,
    request: ChatRequest,
    db: DBSession,
    current_user: CurrentUser,
) -> ChatResponse:
    """
    Send a message in a session and get agent response.
    """
    # Get session
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    if session.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this session",
        )

    if session.status == SessionStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session is already completed",
        )

    # Save user message
    user_message = Message(
        session_id=session_id,
        role=MessageRole.user,
        content=request.content,
        stage_id=session.current_stage,
    )
    db.add(user_message)
    db.flush()  # Get ID without committing

    # Get conversation history for context
    history = (
        db.query(Message)
        .filter(Message.session_id == session_id)
        .order_by(Message.created_at.asc())
        .all()
    )

    # Process with FlowEngine
    llm_client = get_llm_client()
    engine = FlowEngine(session, history, current_user, llm_client)
    response_content, new_stage, is_complete, llm_metadata = await engine.process(request.content)

    # Save assistant message
    assistant_message = Message(
        session_id=session_id,
        role=MessageRole.assistant,
        content=response_content,
        stage_id=new_stage,
        llm_metadata=llm_metadata,
    )
    db.add(assistant_message)

    # Update session state
    session.current_stage = new_stage
    if is_complete:
        session.status = SessionStatus.COMPLETED
        session.completed_at = datetime.utcnow()

    db.commit()
    db.refresh(user_message)
    db.refresh(assistant_message)
    db.refresh(session)

    # Run post-session evaluation if session just completed
    if is_complete:
        try:
            # Build full message list including the final messages we just saved
            all_messages = (
                db.query(Message)
                .filter(Message.session_id == session_id)
                .order_by(Message.created_at.asc())
                .all()
            )
            msg_dicts = [
                {
                    "role": m.role.value,
                    "content": m.content,
                    "stage_id": m.stage_id,
                    "llm_metadata": m.llm_metadata,
                    "created_at": m.created_at.isoformat() if m.created_at else None,
                }
                for m in all_messages
            ]
            evaluation = await evaluate_session(msg_dicts)
            if evaluation:
                session.evaluation_data = evaluation
                db.commit()
                db.refresh(session)
                logger.info(f"Session {session_id} evaluation saved.")
            else:
                logger.warning(f"Session {session_id} evaluation returned None.")
        except Exception as e:
            logger.error(f"Post-session evaluation failed for {session_id}: {e}")

    return ChatResponse(
        user_message=MessageRead.model_validate(user_message),
        assistant_message=MessageRead.model_validate(assistant_message),
        session_status=session.status.value,
        current_stage=session.current_stage,
    )


@router.post("/{session_id}/complete", response_model=SessionRead)
def complete_session(
    session_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> ChatSession:
    """
    Manually mark a session as completed.
    """
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    if session.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this session",
        )

    session.status = SessionStatus.COMPLETED
    session.completed_at = datetime.utcnow()

    db.commit()
    db.refresh(session)

    return session
