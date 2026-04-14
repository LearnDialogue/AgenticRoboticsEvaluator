"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { adminApi, sessionsApi, stagesApi } from "@/lib/api";
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
  prompt_version?: string;
  model_name?: string;
  evaluation_data?: Record<string, unknown> | null;
}

interface Student {
  id: string;
  username: string;
  display_name: string | null;
  role: "student" | "admin";
  created_at: string;
}

interface StageInfo {
  goal: string;
  system_prompt: string;
  completion_criteria: string;
  max_turns: number;
  next_stage: string | null;
  stage_number: number;
}

type SessionStatusFilter = "ALL" | "ACTIVE" | "COMPLETED";

function formatStageLabel(stageId: string) {
  return stageId.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatStudentLabel(student?: Student | null) {
  if (!student) return "Unknown Student";
  return student.display_name?.trim() || student.username;
}

function getSessionScore(session: Session): number | null {
  const quality = session.evaluation_data?.session_quality as
    | Record<string, unknown>
    | undefined;
  return typeof quality?.overall_score === "number" ? (quality.overall_score as number) : null;
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

function AdminMetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
    </div>
  );
}

function JsonPanel({
  title,
  data,
}: {
  title: string;
  data: unknown;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500">Inspect the raw payload behind this view.</p>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
        >
          {open ? "Hide JSON" : "Show JSON"}
        </button>
      </div>
      {open && (
        <pre className="mt-3 max-h-80 overflow-x-auto overflow-y-auto rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs text-gray-600">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout } = useAuth();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [stages, setStages] = useState<Record<string, StageInfo>>({});
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [adminSearch, setAdminSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<SessionStatusFilter>("ALL");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  // Load sessions and stage config on mount
  useEffect(() => {
    if (user) {
      loadDashboardData();
      loadStages();
    }
  }, [user]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (user?.role === "admin") return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, user?.role]);

  const loadStages = async () => {
    try {
      const data = await stagesApi.get();
      setStages(data.stages);
    } catch (err) {
      console.error("Failed to load stages:", err);
    }
  };

  const loadDashboardData = async () => {
    setIsLoadingSessions(true);
    try {
      if (user?.role === "admin") {
        const [{ items }, studentList] = await Promise.all([
          adminApi.listSessions(1, 200),
          adminApi.listStudents(),
        ]);
        setSessions(items);
        setStudents(studentList);

        const firstStudentId = items[0]?.student_id ?? null;
        setSelectedStudentId(firstStudentId);

        const active = firstStudentId
          ? items.find((s: Session) => s.student_id === firstStudentId && s.status === "ACTIVE")
          : undefined;
        if (active) await selectSession(active, true);
        else if (firstStudentId) {
          const firstStudentSession = items.find((s: Session) => s.student_id === firstStudentId);
          if (firstStudentSession) await selectSession(firstStudentSession, true);
        }
        else {
          setSelectedSession(null);
          setMessages([]);
        }
      } else {
        const { items } = await sessionsApi.list(1, 50);
        setSessions(items);
        setStudents([]);
        setSelectedStudentId(null);

        const active = items.find((s: Session) => s.status === "ACTIVE");
        if (active) await selectSession(active, false);
        else if (items.length > 0) await selectSession(items[0], false);
        else {
          setSelectedSession(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const selectSession = async (session: Session, adminMode = user?.role === "admin") => {
    setSelectedSession(session);
    setIsLoadingMessages(true);
    try {
      if (adminMode) {
        const [sessionData, messageData] = await Promise.all([
          adminApi.getSession(session.id),
          adminApi.getSessionMessages(session.id),
        ]);
        setSelectedSession(sessionData);
        setMessages(messageData);
      } else {
        const msgs = await sessionsApi.getMessages(session.id);
        setSelectedSession(session);
        setMessages(msgs);
      }
    } catch (err) {
      console.error("Failed to load messages:", err);
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const createNewSession = async () => {
    if (user?.role === "admin") return;

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
    if (user?.role === "admin") return;
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

  const studentById = students.reduce<Record<string, Student>>((acc, student) => {
    acc[student.id] = student;
    return acc;
  }, {});

  const adminVisibleSessions = sessions.filter((session) => {
    if (user?.role !== "admin") return true;
    return statusFilter === "ALL" || session.status === statusFilter;
  });

  const studentSessionsMap = adminVisibleSessions.reduce<Record<string, Session[]>>((acc, session) => {
    if (!acc[session.student_id]) acc[session.student_id] = [];
    acc[session.student_id].push(session);
    return acc;
  }, {});

  const filteredStudents =
    user?.role === "admin"
      ? students.filter((student) => {
          const query = adminSearch.trim().toLowerCase();
          const sessionsForStudent = studentSessionsMap[student.id] || [];
          if (sessionsForStudent.length === 0) return false;
          if (query.length === 0) return true;
          return (
            formatStudentLabel(student).toLowerCase().includes(query) ||
            student.username.toLowerCase().includes(query) ||
            sessionsForStudent.some((session) =>
              formatStageLabel(session.current_stage).toLowerCase().includes(query)
            )
          );
        })
      : students;

  const selectedStudent =
    (selectedStudentId && studentById[selectedStudentId]) ||
    (selectedSession ? studentById[selectedSession.student_id] : null);

  const selectedStudentSessions =
    user?.role === "admin" && selectedStudentId
      ? (studentSessionsMap[selectedStudentId] || []).sort(
          (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
        )
      : [];

  const completedSessions = sessions.filter((session) => session.status === "COMPLETED");
  const evaluatedSessions = sessions.filter((session) => getSessionScore(session) !== null);
  const totalStudents = new Set(sessions.map((session) => session.student_id)).size;
  const averageScore =
    evaluatedSessions.length > 0
      ? (
          evaluatedSessions.reduce(
            (sum, session) => sum + (getSessionScore(session) || 0),
            0
          ) / evaluatedSessions.length
        ).toFixed(1)
      : "N/A";
  const completionRate =
    sessions.length > 0
      ? `${Math.round((completedSessions.length / sessions.length) * 100)}%`
      : "0%";
  const latestStudentMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user");
  const latestSelectedStudentSession = selectedStudentSessions[0] || null;
  const selectedStudentLatestDate = latestSelectedStudentSession
    ? new Date(latestSelectedStudentSession.started_at).toLocaleDateString([], {
        timeZone: "America/New_York",
      })
    : null;
  const selectedSessionDate = selectedSession
    ? new Date(selectedSession.started_at).toLocaleDateString([], {
        timeZone: "America/New_York",
      })
    : null;

  const handleSelectStudent = async (studentId: string) => {
    setSelectedStudentId(studentId);
    const sessionsForStudent = (studentSessionsMap[studentId] || []).sort(
      (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    );
    const active = sessionsForStudent.find((session) => session.status === "ACTIVE");
    const nextSession = active || sessionsForStudent[0] || null;

    if (nextSession) {
      await selectSession(nextSession, true);
    } else {
      setSelectedSession(null);
      setMessages([]);
    }
  };

  const returnToStudentDirectory = () => {
    setSelectedStudentId(null);
    setSelectedSession(null);
    setMessages([]);
  };

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
      {!isAdmin && (
      <aside
        className={`${
          sidebarOpen ? "w-72" : "w-0"
        } transition-all duration-200 bg-white border-r border-gray-200 flex flex-col overflow-hidden`}
      >
        {/* Sidebar header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                {isAdmin ? "Students" : "Sessions"}
              </h2>
              {isAdmin && (
                <p className="mt-1 text-xs text-gray-500">
                  Pick a student to review their conversations and evaluation data.
                </p>
              )}
            </div>
            {!isAdmin && (
              <button
                onClick={createNewSession}
                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors"
              >
                + New
              </button>
            )}
          </div>
          {isAdmin && (
            <div className="space-y-2">
              <input
                type="text"
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
                placeholder="Search student, username, or stage"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as SessionStatusFilter)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="ALL">All statuses</option>
                <option value="ACTIVE">Active only</option>
                <option value="COMPLETED">Completed only</option>
              </select>
            </div>
          )}
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingSessions ? (
            <div className="p-4 text-sm text-gray-400">Loading sessions...</div>
          ) : isAdmin && filteredStudents.length === 0 ? (
            <div className="p-4 text-sm text-gray-400">
              No students match the current filters.
            </div>
          ) : !isAdmin && sessions.length === 0 ? (
            <div className="p-4 text-sm text-gray-400">
              No sessions yet. Create one!
            </div>
          ) : (
            isAdmin
              ? filteredStudents.map((student) => {
                  const sessionsForStudent = (studentSessionsMap[student.id] || []).sort(
                    (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
                  );
                  const latestSession = sessionsForStudent[0];
                  const activeCount = sessionsForStudent.filter((session) => session.status === "ACTIVE").length;
                  const evaluatedCount = sessionsForStudent.filter(
                    (session) => getSessionScore(session) !== null
                  ).length;

                  return (
                    <button
                      key={student.id}
                      onClick={() => handleSelectStudent(student.id)}
                      className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                        selectedStudentId === student.id ? "bg-blue-50 border-l-2 border-l-blue-500" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate text-sm font-medium text-gray-900">
                          {formatStudentLabel(student)}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {sessionsForStudent.length} convo{sessionsForStudent.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-gray-500">@{student.username}</p>
                      <div className="mt-2 flex items-center justify-between text-[10px] text-gray-500">
                        <span>{latestSession ? formatStageLabel(latestSession.current_stage) : "No sessions"}</span>
                        <span>{activeCount > 0 ? `${activeCount} active` : `${evaluatedCount} evaluated`}</span>
                      </div>
                    </button>
                  );
                })
              : sessions.map((s) => (
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
                      Started {new Date(s.started_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "America/New_York",
                      })}
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
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!isAdmin && (
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  {sidebarOpen ? "\u2039" : "\u203A"}
                </button>
              )}
              {isAdmin && selectedStudentId && (
                <button
                  onClick={returnToStudentDirectory}
                  className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                >
                  Back to Students
                </button>
              )}
              <div>
                {isAdmin ? (
                  <>
                    <h1 className="text-base font-semibold text-gray-900">
                      {!selectedStudentId
                        ? "Admin Dashboard"
                        : formatStudentLabel(selectedStudent)}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                      {!selectedStudentId
                        ? "Browse students and open a conversation to inspect details."
                        : selectedSession
                          ? `Session on ${selectedSessionDate} | ${selectedSession.status} | ${formatStageLabel(selectedSession.current_stage)}`
                          : `@${selectedStudent?.username || "unknown"} | ${selectedStudentSessions.length} conversation${selectedStudentSessions.length !== 1 ? "s" : ""} | latest ${selectedStudentLatestDate || "N/A"}`}
                    </p>
                  </>
                ) : (
                  <>
                    <h1 className="text-base font-semibold text-gray-900">
                      Reflection Session
                    </h1>
                    {selectedSession && (
                      <div className="mt-1">
                        <StageProgressBar
                          currentStage={selectedSession.current_stage}
                          isCompleted={selectedSession.status === "COMPLETED"}
                          turnCounts={turnCounts}
                          compact
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            {isAdmin && (
              <button
                onClick={logout}
                className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              >
                Logout
              </button>
            )}
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 chat-messages">
          {!isAdmin && <UnityAvatarPanel />}

          {isAdmin && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <AdminMetricCard
                label="Students With Sessions"
                value={String(totalStudents)}
              />
              <AdminMetricCard
                label="Completed Sessions"
                value={String(completedSessions.length)}
              />
              <AdminMetricCard label="Completion Rate" value={completionRate} />
              <AdminMetricCard
                label="Average Evaluation"
                value={averageScore === "N/A" ? averageScore : `${averageScore}/5`}
              />
            </div>
          )}

          {isAdmin && !selectedStudentId && (
            <div className="space-y-6">
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">
                      Student Directory
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-gray-900">
                      All Students
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Select a student to open their conversation history, evaluations, and raw JSON.
                    </p>
                  </div>
                  <div className="flex w-full flex-col gap-2 lg:w-auto lg:min-w-[320px]">
                    <input
                      type="text"
                      value={adminSearch}
                      onChange={(e) => setAdminSearch(e.target.value)}
                      placeholder="Search student, username, or stage"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as SessionStatusFilter)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ALL">All statuses</option>
                      <option value="ACTIVE">Active only</option>
                      <option value="COMPLETED">Completed only</option>
                    </select>
                  </div>
                </div>
              </div>

              {filteredStudents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">
                  No students match the current filters.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredStudents.map((student) => {
                    const sessionsForStudent = (studentSessionsMap[student.id] || []).sort(
                      (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
                    );
                    const latestSession = sessionsForStudent[0];
                    const activeCount = sessionsForStudent.filter((session) => session.status === "ACTIVE").length;
                    const averageStudentScore =
                      sessionsForStudent.filter((session) => getSessionScore(session) !== null).length > 0
                        ? (
                            sessionsForStudent.reduce(
                              (sum, session) => sum + (getSessionScore(session) || 0),
                              0
                            ) /
                            sessionsForStudent.filter((session) => getSessionScore(session) !== null).length
                          ).toFixed(1)
                        : null;

                    return (
                      <button
                        key={student.id}
                        onClick={() => handleSelectStudent(student.id)}
                        className="rounded-2xl border border-gray-200 bg-white p-5 text-left transition-colors hover:border-blue-300 hover:bg-blue-50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-lg font-semibold text-gray-900">
                              {formatStudentLabel(student)}
                            </p>
                            <p className="mt-1 text-sm text-gray-500">@{student.username}</p>
                          </div>
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                            {sessionsForStudent.length} conversation{sessionsForStudent.length !== 1 ? "s" : ""}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                          <div className="rounded-lg bg-gray-50 p-3">
                            <p className="text-[10px] uppercase tracking-wide text-gray-400">Current Focus</p>
                            <p className="mt-1 text-gray-700">
                              {latestSession ? formatStageLabel(latestSession.current_stage) : "No sessions"}
                            </p>
                          </div>
                          <div className="rounded-lg bg-gray-50 p-3">
                            <p className="text-[10px] uppercase tracking-wide text-gray-400">Status</p>
                            <p className="mt-1 text-gray-700">
                              {activeCount > 0 ? `${activeCount} active` : "No active sessions"}
                            </p>
                          </div>
                          <div className="rounded-lg bg-gray-50 p-3">
                            <p className="text-[10px] uppercase tracking-wide text-gray-400">Latest Session</p>
                            <p className="mt-1 text-gray-700">
                              {latestSession
                                ? new Date(latestSession.started_at).toLocaleDateString([], {
                                    timeZone: "America/New_York",
                                  })
                                : "N/A"}
                            </p>
                          </div>
                          <div className="rounded-lg bg-gray-50 p-3">
                            <p className="text-[10px] uppercase tracking-wide text-gray-400">Average Eval</p>
                            <p className="mt-1 text-gray-700">
                              {averageStudentScore ? `${averageStudentScore}/5` : "No eval yet"}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {!selectedSession && !isAdmin && (
            <div className="text-center text-gray-400 mt-16">
              <p className="text-lg">
                Select a session or create a new one
              </p>
            </div>
          )}

          {selectedSession && isAdmin && selectedStudentId && (
            <div className="space-y-4 mb-6">
              <p className="text-sm text-gray-500">
                Viewing {selectedStudentSessions.length} conversation{selectedStudentSessions.length !== 1 ? "s" : ""} for {formatStudentLabel(selectedStudent)}.
              </p>

              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">
                      Conversations
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-gray-900">
                      {formatStudentLabel(selectedStudent)}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Select a conversation to inspect the full transcript and evaluation context.
                    </p>
                  </div>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                    {selectedStudentSessions.length} conversation{selectedStudentSessions.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {selectedStudentSessions.map((session) => {
                    const score = getSessionScore(session);
                    return (
                      <button
                        key={session.id}
                        onClick={() => selectSession(session, true)}
                        className={`rounded-xl border p-4 text-left transition-colors ${
                          selectedSession.id === session.id
                            ? "border-blue-300 bg-blue-50"
                            : "border-gray-200 bg-white hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                              session.status === "ACTIVE"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {session.status === "ACTIVE" ? "Active" : "Completed"}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(session.started_at).toLocaleDateString([], {
                              timeZone: "America/New_York",
                            })}
                          </span>
                        </div>
                        <p className="mt-3 text-sm font-medium text-gray-900">
                          {formatStageLabel(session.current_stage)}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {session.model_name || "model unknown"} | {session.prompt_version || "prompt unknown"}
                        </p>
                        <div className="mt-3 flex items-center justify-between text-[10px] text-gray-500">
                          <span>{session.id.slice(0, 8)}</span>
                          <span>{score !== null ? `${score}/5 score` : "No evaluation yet"}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mx-auto flex max-w-6xl flex-col items-center gap-4">
                <div className="w-full max-w-4xl rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-400">
                        Session Summary
                      </p>
                      <h2 className="mt-1 text-lg font-semibold text-gray-900">
                        {formatStudentLabel(selectedStudent)}
                      </h2>
                      <p className="mt-1 text-sm text-gray-500">
                        @{selectedStudent?.username || "unknown"} | {selectedSession.model_name || "model unknown"} | {selectedSession.prompt_version || "prompt unknown"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          selectedSession.status === "COMPLETED"
                            ? "bg-green-100 text-green-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {selectedSession.status}
                      </span>
                      <button
                        onClick={() =>
                          router.push(`/dashboard/${selectedSession.id}/inspect`)
                        }
                        className="text-xs bg-purple-100 text-purple-700 px-3 py-1.5 rounded-md hover:bg-purple-200 transition-colors"
                      >
                        Inspect Full Session Details
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <StageProgressBar
                      currentStage={selectedSession.current_stage}
                      isCompleted={selectedSession.status === "COMPLETED"}
                      turnCounts={turnCounts}
                    />
                  </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-sm">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-[10px] uppercase tracking-wide text-gray-400">Started</p>
                    <p className="mt-1 text-gray-700">
                      {new Date(selectedSession.started_at).toLocaleString([], { timeZone: "America/New_York" })}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-[10px] uppercase tracking-wide text-gray-400">Completed</p>
                    <p className="mt-1 text-gray-700">
                      {selectedSession.completed_at
                        ? new Date(selectedSession.completed_at).toLocaleString([], { timeZone: "America/New_York" })
                        : "Still active"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-[10px] uppercase tracking-wide text-gray-400">Messages</p>
                    <p className="mt-1 text-gray-700">{messages.length}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-[10px] uppercase tracking-wide text-gray-400">Latest Student Note</p>
                    <p className="mt-1 text-gray-700 line-clamp-2">
                      {latestStudentMessage?.content || "No student message yet"}
                    </p>
                  </div>
                </div>

                </div>

                <div className="w-full max-w-4xl space-y-4">
                  {selectedSession.evaluation_data && (
                    <JsonPanel title="Evaluation JSON" data={selectedSession.evaluation_data} />
                  )}
                </div>
              </div>
            </div>
          )}

          {selectedSession && isLoadingMessages && (
            <div className="text-center text-gray-400 mt-8">Loading messages...</div>
          )}

          {selectedSession && !isLoadingMessages && messages.length === 0 && (
            <div className="text-center text-gray-400 mt-8">
              <p className="text-lg">
                {isAdmin ? "No messages in this session yet." : "Start the conversation!"}
              </p>
              {!isAdmin && (
                <p className="text-sm mt-1">Type a message below to begin reflecting.</p>
              )}
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
          {isAdmin ? (
            selectedStudentId && selectedSession ? (
              <div className="flex items-center justify-between gap-3 text-sm text-gray-500">
                <span>
                  Admin review mode is read-only here. Open the full inspector for stage registry details, richer metadata, and deeper raw JSON views.
                </span>
                <button
                  onClick={() => router.push(`/dashboard/${selectedSession.id}/inspect`)}
                  className="rounded-md bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-200"
                >
                  Inspect Session
                </button>
              </div>
            ) : (
              <div className="text-center text-sm text-gray-500 py-2">
                Select a student to open their conversations, then choose a session to review.
              </div>
            )
          ) : selectedSession?.status === "COMPLETED" ? (
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
