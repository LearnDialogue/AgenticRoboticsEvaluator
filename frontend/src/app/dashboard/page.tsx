"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { sessionsApi, stagesApi } from "@/lib/api";
import MessageCard from "@/components/MessageCard";
import StageProgressBar from "@/components/StageProgressBar";
import UnityAvatarPanel from "@/components/UnityAvatarPanel";

function sendAvatarState(state: string) {
  if (typeof window === "undefined") return;
  window.unityAvatarBridge?.sendState(state);
}

function sendAvatarUserMessage(message: string) {
  if (typeof window === "undefined") return;
  window.unityAvatarBridge?.sendUserMessage(message);
}

function sendAvatarAssistantMessage(message: string) {
  if (typeof window === "undefined") return;
  window.unityAvatarBridge?.sendAssistantMessage(message);
}

interface Message {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  stage_id: string;
  llm_metadata?: Record<string, unknown> | null;
  created_at: string;
}

interface Session {
  id: string;
  student_id: string;
  status: "ACTIVE" | "COMPLETED";
  current_stage: string;
  started_at: string;
  completed_at: string | null;
  evaluation_data?: Record<string, unknown> | null;
}

interface StageInfo {
  goal: string;
  system_prompt: string;
  completion_criteria: string;
  max_turns: number;
  next_stage: string | null;
  stage_number: number;
}

function InlineEvaluation({ data }: { data: Record<string, unknown> }) {
  const [showRaw, setShowRaw] = useState(false);

  const quality = data.session_quality as Record<string, unknown> | undefined;
  const flow = data.flow_assessment as Record<string, unknown> | undefined;
  const profile = data.student_profile as Record<string, unknown> | undefined;
  const tutor = data.tutor_performance as Record<string, unknown> | undefined;
  const engagement = data.engagement_arc as Record<string, unknown> | undefined;
  const recs = data.recommendations as Record<string, unknown> | undefined;
  const evalMeta = data._eval_metadata as Record<string, unknown> | undefined;
  const cps = data.cps_complaint_analysis as Record<string, unknown> | undefined;

  const score = quality?.overall_score as number | undefined;

  return (
    <div className="mx-2 my-3 rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-indigo-100/60 border-b border-indigo-200">
        <h3 className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
          Session Evaluation
        </h3>
        {evalMeta && (
          <span className="text-[10px] text-gray-400">
            {String(evalMeta.model)} | {((evalMeta.response_time_ms as number) / 1000).toFixed(1)}s
          </span>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Score banner */}
        {quality && (
          <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-indigo-100">
            <div className="text-2xl font-bold text-indigo-700 shrink-0">{score}/5</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700">{String(quality.justification)}</p>
              <div className="flex gap-4 mt-2">
                <div className="flex-1">
                  <p className="text-[10px] text-green-600 uppercase tracking-wide font-medium">Strengths</p>
                  <ul className="mt-1 space-y-0.5">
                    {((quality.strengths || []) as string[]).map((s, i) => (
                      <li key={i} className="text-xs text-gray-600">- {s}</li>
                    ))}
                  </ul>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-red-500 uppercase tracking-wide font-medium">Weaknesses</p>
                  <ul className="mt-1 space-y-0.5">
                    {((quality.weaknesses || []) as string[]).map((s, i) => (
                      <li key={i} className="text-xs text-gray-600">- {s}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2x2 grid - compact */}
        <div className="grid grid-cols-2 gap-3">
          {flow && (
            <div className="p-2.5 bg-white rounded-lg border border-gray-100">
              <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Flow Assessment</h4>
              <p className="text-xs text-gray-700 mb-1">
                Transitions: {flow.transitions_appropriate ? "Appropriate" : "Needs work"}
              </p>
              <p className="text-xs text-gray-600">{String(flow.transition_notes)}</p>
              {((flow.stages_that_felt_rushed || []) as string[]).length > 0 && (
                <p className="text-[10px] text-amber-600 mt-1">Rushed: {((flow.stages_that_felt_rushed) as string[]).join(", ")}</p>
              )}
              {((flow.stages_that_dragged || []) as string[]).length > 0 && (
                <p className="text-[10px] text-amber-600 mt-0.5">Dragged: {((flow.stages_that_dragged) as string[]).join(", ")}</p>
              )}
            </div>
          )}

          {tutor && (
            <div className="p-2.5 bg-white rounded-lg border border-gray-100">
              <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Tutor Performance</h4>
              <p className="text-xs text-gray-700">Rapport: {String(tutor.rapport_quality)}</p>
              <p className="text-xs text-gray-700">Questioning: {String(tutor.questioning_quality)}</p>
              {((tutor.best_moments || []) as string[]).length > 0 && (
                <div className="mt-1">
                  <p className="text-[10px] text-green-600">Best moments:</p>
                  {((tutor.best_moments) as string[]).map((m, i) => (
                    <p key={i} className="text-[10px] text-gray-600 ml-2">- {m}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {profile && (
            <div className="p-2.5 bg-white rounded-lg border border-gray-100">
              <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Student Profile</h4>
              {String(profile.name || "") && String(profile.name) !== "null" && (
                <p className="text-xs text-gray-800 font-medium mb-1">{String(profile.name)}</p>
              )}
              {((profile.personal_details || []) as string[]).length > 0 && (
                <div className="mb-1">
                  {((profile.personal_details) as string[]).map((d, i) => (
                    <p key={i} className="text-[10px] text-gray-600">- {d}</p>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-700">{String(profile.project_context)}</p>
              {String(profile.technical_background || "") && String(profile.technical_background) !== "N/A" && (
                <p className="text-xs text-gray-600 mt-0.5">Technical: {String(profile.technical_background)}</p>
              )}
              <p className="text-xs text-gray-600 mt-0.5">Style: {String(profile.communication_style)}</p>
              <p className="text-xs text-gray-600">Emotional: {String(profile.emotional_patterns)}</p>
              {String(profile.motivations || "") && String(profile.motivations) !== "N/A" && (
                <p className="text-xs text-gray-600">Motivations: {String(profile.motivations)}</p>
              )}
              {((profile.key_insights || []) as string[]).length > 0 && (
                <div className="mt-1">
                  <p className="text-[10px] text-blue-600">Key insights:</p>
                  {((profile.key_insights) as string[]).map((ins, i) => (
                    <p key={i} className="text-[10px] text-gray-600 ml-2">- {ins}</p>
                  ))}
                </div>
              )}
              {((profile.memory_hooks || []) as string[]).length > 0 && (
                <div className="mt-1">
                  <p className="text-[10px] text-purple-600">Remember for next time:</p>
                  {((profile.memory_hooks) as string[]).map((h, i) => (
                    <p key={i} className="text-[10px] text-gray-600 ml-2 italic">"{h}"</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {engagement && (
            <div className="p-2.5 bg-white rounded-lg border border-gray-100">
              <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Engagement Arc</h4>
              <p className="text-xs text-gray-700">{String(engagement.summary)}</p>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium mt-1 ${
                engagement.trajectory === "rising" ? "bg-green-100 text-green-700" :
                engagement.trajectory === "falling" ? "bg-red-100 text-red-700" :
                engagement.trajectory === "steady" ? "bg-blue-100 text-blue-700" :
                "bg-yellow-100 text-yellow-700"
              }`}>
                {String(engagement.trajectory)}
              </span>
            </div>
          )}
        </div>

        {/* CPS Complaint Analysis */}
        {cps && (
          <div className="p-3 bg-white rounded-lg border border-gray-100">
            <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">CPS Complaint Analysis</h4>
            {cps.complaints_found ? (
              <>
                <p className="text-xs text-gray-600 mb-2">{String(cps.cps_summary)}</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border border-gray-200 rounded">
                    <thead>
                      <tr className="bg-gray-50 text-left text-[10px] uppercase tracking-wide text-gray-500">
                        <th className="px-2 py-1.5 border-b border-gray-200">Complaint</th>
                        <th className="px-2 py-1.5 border-b border-gray-200">Facet</th>
                        <th className="px-2 py-1.5 border-b border-gray-200">Sub-facet</th>
                        <th className="px-2 py-1.5 border-b border-gray-200">Indicator</th>
                        <th className="px-2 py-1.5 border-b border-gray-200">Valence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(cps.complaints as Array<Record<string, string>>).map((c, i) => (
                        <tr key={i} className="border-b border-gray-100 last:border-b-0">
                          <td className="px-2 py-1.5 text-gray-700 italic">&ldquo;{c.complaint_text}&rdquo;</td>
                          <td className="px-2 py-1.5 text-gray-700">{c.facet}</td>
                          <td className="px-2 py-1.5 text-gray-700">{c.sub_facet}</td>
                          <td className="px-2 py-1.5 text-gray-700">{c.indicator}</td>
                          <td className="px-2 py-1.5">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              c.valence === "positive" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                            }`}>
                              {c.valence}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-xs text-gray-500">No CPS-related complaints were raised in this session.</p>
            )}
          </div>
        )}

        {/* Recommendations */}
        {recs && (
          <div className="p-3 bg-white rounded-lg border border-gray-100">
            <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Recommendations</h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] text-indigo-600 font-medium">Next Session</p>
                {((recs.for_next_session || []) as string[]).map((r, i) => (
                  <p key={i} className="text-[10px] text-gray-600 mt-0.5">- {r}</p>
                ))}
              </div>
              <div>
                <p className="text-[10px] text-indigo-600 font-medium">Prompt Tuning</p>
                {((recs.for_prompt_tuning || []) as string[]).map((r, i) => (
                  <p key={i} className="text-[10px] text-gray-600 mt-0.5">- {r}</p>
                ))}
              </div>
              <div>
                <p className="text-[10px] text-indigo-600 font-medium">System Design</p>
                {((recs.for_system_design || []) as string[]).map((r, i) => (
                  <p key={i} className="text-[10px] text-gray-600 mt-0.5">- {r}</p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Raw JSON toggle */}
        <div className="pt-2 border-t border-indigo-100">
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="text-[10px] text-gray-400 hover:text-gray-600 font-medium"
          >
            {showRaw ? "Hide" : "Show"} raw evaluation JSON
          </button>
          {showRaw && (
            <pre className="mt-1 text-[10px] text-gray-500 bg-gray-50 p-2 rounded border border-gray-100 overflow-x-auto max-h-48 overflow-y-auto">
              {JSON.stringify(data, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout } = useAuth();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [stages, setStages] = useState<Record<string, StageInfo>>({});
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  // Load sessions and stage config on mount
  useEffect(() => {
    if (user) {
      loadSessions();
      loadStages();
    }
  }, [user]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadStages = async () => {
    try {
      const data = await stagesApi.get();
      setStages(data.stages);
    } catch (err) {
      console.error("Failed to load stages:", err);
    }
  };

  const loadSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const { items } = await sessionsApi.list(1, 50);
      setSessions(items);
      // Auto-select first active session, or most recent
      const active = items.find((s: Session) => s.status === "ACTIVE");
      if (active) selectSession(active);
      else if (items.length > 0) selectSession(items[0]);
    } catch (err) {
      console.error("Failed to load sessions:", err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const selectSession = async (session: Session) => {
    setSelectedSession(session);
    setIsLoadingMessages(true);
    try {
      const msgs = await sessionsApi.getMessages(session.id);
      setMessages(msgs);
    } catch (err) {
      console.error("Failed to load messages:", err);
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const createNewSession = async () => {
    try {
      const newSession = await sessionsApi.create();
      setSessions((prev) => [newSession, ...prev]);
      setSelectedSession(newSession);
      setMessages([]);
    } catch (err) {
      console.error("Failed to create session:", err);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedSession || isSending) return;

    const content = input.trim();
    setInput("");
    setIsSending(true);
    sendAvatarUserMessage(content);
    sendAvatarState("thinking");

    try {
      const response = await sessionsApi.chat(selectedSession.id, content);
      setMessages((prev) => [
        ...prev,
        response.user_message,
        response.assistant_message,
      ]);
      setSelectedSession((prev) =>
        prev
          ? {
              ...prev,
              current_stage: response.current_stage,
              status: response.session_status,
            }
          : null
      );
      // Update session in sidebar
      setSessions((prev) =>
        prev.map((s) =>
          s.id === selectedSession.id
            ? { ...s, current_stage: response.current_stage, status: response.session_status }
            : s
        )
      );
      sendAvatarAssistantMessage(response.assistant_message.content);
      sendAvatarState("listening");
      // If session just completed, re-fetch to get evaluation_data
      if (response.session_status === "COMPLETED") {
        try {
          const updated = await sessionsApi.get(selectedSession.id);
          setSelectedSession(updated);
          setSessions((prev) =>
            prev.map((s) => (s.id === updated.id ? updated : s))
          );
        } catch (refetchErr) {
          console.error("Failed to refetch completed session:", refetchErr);
        }
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      sendAvatarState("idle");
    } finally {
      setIsSending(false);
    }
  };

  // Compute turn counts per stage for the progress bar
  const turnCounts: Record<string, number> = {};
  messages
    .filter((m) => m.role === "assistant")
    .forEach((m) => {
      turnCounts[m.stage_id] = (turnCounts[m.stage_id] || 0) + 1;
    });

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </main>
    );
  }
  if (!user) return null;

  const isAdmin = user.role === "admin";

  return (
    <main className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-72" : "w-0"
        } transition-all duration-200 bg-white border-r border-gray-200 flex flex-col overflow-hidden`}
      >
        {/* Sidebar header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Sessions
            </h2>
            <button
              onClick={createNewSession}
              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors"
            >
              + New
            </button>
          </div>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingSessions ? (
            <div className="p-4 text-sm text-gray-400">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="p-4 text-sm text-gray-400">
              No sessions yet. Create one!
            </div>
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => selectSession(s)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                  selectedSession?.id === s.id ? "bg-blue-50 border-l-2 border-l-blue-500" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      s.status === "ACTIVE"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {s.status === "ACTIVE" ? "Active" : "Done"}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(s.started_at).toLocaleDateString([], { timeZone: "America/New_York" })}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1 truncate">
                  {isAdmin
                    ? `Stage: ${s.current_stage.replace(/_/g, " ")}`
                    : `Started ${new Date(s.started_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "America/New_York",
                      })}`}
                </p>
              </button>
            ))
          )}
        </div>

        {/* Sidebar footer */}
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 truncate">
              {user.display_name || user.username}
              {isAdmin && (
                <span className="ml-1 text-[10px] text-purple-600 font-medium">
                  ADMIN
                </span>
              )}
            </span>
            <button
              onClick={logout}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                {sidebarOpen ? "\u2039" : "\u203A"}
              </button>
              <div>
                <h1 className="text-base font-semibold text-gray-900">
                  Reflection Session
                </h1>
                {selectedSession && isAdmin && (
                  <div className="mt-1">
                    <StageProgressBar
                      currentStage={selectedSession.current_stage}
                      isCompleted={selectedSession.status === "COMPLETED"}
                      turnCounts={turnCounts}
                      compact
                    />
                  </div>
                )}
              </div>
              {selectedSession && (
                isAdmin && (
                <button
                  onClick={() =>
                    router.push(`/dashboard/${selectedSession.id}/inspect`)
                  }
                  className="text-xs bg-purple-100 text-purple-700 px-3 py-1.5 rounded-md hover:bg-purple-200 transition-colors"
                >
                  Inspect Full Session Details
                </button>
                )
              )}
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 chat-messages">
          {!isAdmin && <UnityAvatarPanel />}

          {!selectedSession && (
            <div className="text-center text-gray-400 mt-16">
              <p className="text-lg">Select a session or create a new one</p>
            </div>
          )}

          {selectedSession && isLoadingMessages && (
            <div className="text-center text-gray-400 mt-8">Loading messages...</div>
          )}

          {selectedSession && !isLoadingMessages && messages.length === 0 && (
            <div className="text-center text-gray-400 mt-8">
              <p className="text-lg">Start the conversation!</p>
              <p className="text-sm mt-1">Type a message below to begin reflecting.</p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <MessageCard
              key={msg.id}
              message={msg}
              stageInfo={stages[msg.stage_id] || null}
              mode="compact"
              showStageBadge={isAdmin}
              showMetadata={isAdmin}
              prevStageId={idx > 0 ? messages[idx - 1].stage_id : undefined}
            />
          ))}

          {isSending && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-900 rounded-2xl rounded-bl-sm px-4 py-2.5">
                <span className="inline-flex gap-1">
                  <span className="animate-bounce">.</span>
                  <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>.</span>
                </span>
              </div>
            </div>
          )}

          {/* Inline evaluation after session completes */}
          {selectedSession?.status === "COMPLETED" && selectedSession.evaluation_data && (
            <InlineEvaluation data={selectedSession.evaluation_data} />
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t border-gray-200 p-4">
          {selectedSession?.status === "COMPLETED" ? (
            <div className="text-center text-sm text-gray-500 py-2">
              Session completed.{" "}
              <button
                onClick={createNewSession}
                className="text-blue-600 hover:underline"
              >
                Start a new session
              </button>
            </div>
          ) : selectedSession ? (
            <form onSubmit={sendMessage} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                disabled={isSending}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              />
              <button
                type="submit"
                disabled={!input.trim() || isSending}
                className="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </main>
  );
}
