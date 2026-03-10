"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { sessionsApi, stagesApi } from "@/lib/api";
import MessageCard from "@/components/MessageCard";
import StageProgressBar from "@/components/StageProgressBar";

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
  model_name: string;
  prompt_version: string;
  evaluation_data: Record<string, unknown> | null;
}

interface StageInfo {
  goal: string;
  system_prompt: string;
  completion_criteria: string;
  max_turns: number;
  next_stage: string | null;
  stage_number: number;
}

function EvalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">{title}</p>
      {children}
    </div>
  );
}

function EvalList({ items }: { items: string[] }) {
  if (!items || items.length === 0) return <p className="text-sm text-gray-500">None</p>;
  return (
    <ul className="list-disc list-inside space-y-0.5">
      {items.map((item, i) => (
        <li key={i} className="text-sm text-gray-700">{item}</li>
      ))}
    </ul>
  );
}

function SessionEvaluationPanel({ data }: { data: Record<string, unknown> }) {
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
    <div className="bg-white rounded-lg border-2 border-indigo-200 p-5 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-indigo-700 uppercase tracking-wide">
          Post-Session Evaluation
        </h2>
        {evalMeta && (
          <span className="text-[10px] text-gray-400">
            {String(evalMeta.model)} | {((evalMeta.response_time_ms as number) / 1000).toFixed(1)}s |{" "}
            {((evalMeta.token_usage as Record<string, number>)?.total || "?").toLocaleString()} tokens
          </span>
        )}
      </div>

      {/* Score banner */}
      {quality && (
        <div className="flex items-center gap-4 mb-4 p-3 bg-indigo-50 rounded-lg">
          <div className="text-3xl font-bold text-indigo-700">{score}/5</div>
          <div className="flex-1">
            <p className="text-sm text-gray-700">{String(quality.justification)}</p>
            <div className="flex gap-4 mt-2">
              <div className="flex-1">
                <p className="text-[10px] text-green-600 uppercase tracking-wide">Strengths</p>
                <EvalList items={(quality.strengths || []) as string[]} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-red-500 uppercase tracking-wide">Weaknesses</p>
                <EvalList items={(quality.weaknesses || []) as string[]} />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Flow Assessment */}
        {flow && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-700 border-b border-gray-100 pb-1">
              Flow Assessment
            </h3>
            <EvalSection title="Transitions Appropriate">
              <p className="text-sm text-gray-700">
                {flow.transitions_appropriate ? "Yes" : "No"}
              </p>
            </EvalSection>
            <EvalSection title="Notes">
              <p className="text-sm text-gray-700">{String(flow.transition_notes)}</p>
            </EvalSection>
            <EvalSection title="Rushed Stages">
              <EvalList items={(flow.stages_that_felt_rushed || []) as string[]} />
            </EvalSection>
            <EvalSection title="Dragged Stages">
              <EvalList items={(flow.stages_that_dragged || []) as string[]} />
            </EvalSection>
          </div>
        )}

        {/* Tutor Performance */}
        {tutor && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-700 border-b border-gray-100 pb-1">
              Tutor Performance
            </h3>
            <EvalSection title="Rapport Quality">
              <p className="text-sm text-gray-700">{String(tutor.rapport_quality)}</p>
            </EvalSection>
            <EvalSection title="Questioning Quality">
              <p className="text-sm text-gray-700">{String(tutor.questioning_quality)}</p>
            </EvalSection>
            <EvalSection title="Best Moments">
              <EvalList items={(tutor.best_moments || []) as string[]} />
            </EvalSection>
            <EvalSection title="Missed Opportunities">
              <EvalList items={(tutor.missed_opportunities || []) as string[]} />
            </EvalSection>
          </div>
        )}

        {/* Student Profile */}
        {profile && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-700 border-b border-gray-100 pb-1">
              Student Profile
            </h3>
            {String(profile.name || "") && String(profile.name) !== "null" && (
              <EvalSection title="Name">
                <p className="text-sm text-gray-700 font-medium">{String(profile.name)}</p>
              </EvalSection>
            )}
            <EvalSection title="Personal Details">
              <EvalList items={(profile.personal_details || []) as string[]} />
            </EvalSection>
            <EvalSection title="Project Context">
              <p className="text-sm text-gray-700">{String(profile.project_context)}</p>
            </EvalSection>
            <EvalSection title="Technical Background">
              <p className="text-sm text-gray-700">{String(profile.technical_background)}</p>
            </EvalSection>
            <EvalSection title="Communication Style">
              <p className="text-sm text-gray-700">{String(profile.communication_style)}</p>
            </EvalSection>
            <EvalSection title="Emotional Patterns">
              <p className="text-sm text-gray-700">{String(profile.emotional_patterns)}</p>
            </EvalSection>
            <EvalSection title="Motivations">
              <p className="text-sm text-gray-700">{String(profile.motivations)}</p>
            </EvalSection>
            <EvalSection title="Key Insights">
              <EvalList items={(profile.key_insights || []) as string[]} />
            </EvalSection>
            <EvalSection title="Unresolved Topics">
              <EvalList items={(profile.unresolved_topics || []) as string[]} />
            </EvalSection>
            <EvalSection title="Memory Hooks">
              <EvalList items={(profile.memory_hooks || []) as string[]} />
            </EvalSection>
          </div>
        )}

        {/* Engagement Arc */}
        {engagement && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-700 border-b border-gray-100 pb-1">
              Engagement Arc
            </h3>
            <EvalSection title="Summary">
              <p className="text-sm text-gray-700">{String(engagement.summary)}</p>
            </EvalSection>
            <EvalSection title="Trajectory">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                engagement.trajectory === "rising" ? "bg-green-100 text-green-700" :
                engagement.trajectory === "falling" ? "bg-red-100 text-red-700" :
                engagement.trajectory === "steady" ? "bg-blue-100 text-blue-700" :
                "bg-yellow-100 text-yellow-700"
              }`}>
                {String(engagement.trajectory)}
              </span>
            </EvalSection>
          </div>
        )}
      </div>

      {/* CPS Complaint Analysis */}
      {cps && (
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
          <h3 className="text-xs font-semibold text-gray-700 border-b border-gray-100 pb-1">
            CPS Complaint Analysis
          </h3>
          {cps.complaints_found ? (
            <>
              <p className="text-sm text-gray-600">{String(cps.cps_summary)}</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-gray-200 rounded-lg">
                  <thead>
                    <tr className="bg-gray-50 text-left text-[10px] uppercase tracking-wide text-gray-500">
                      <th className="px-3 py-2 border-b border-gray-200">Complaint</th>
                      <th className="px-3 py-2 border-b border-gray-200">Facet</th>
                      <th className="px-3 py-2 border-b border-gray-200">Sub-facet</th>
                      <th className="px-3 py-2 border-b border-gray-200">Indicator</th>
                      <th className="px-3 py-2 border-b border-gray-200">Valence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(cps.complaints as Array<Record<string, string>>).map((c, i) => (
                      <tr key={i} className="border-b border-gray-100 last:border-b-0">
                        <td className="px-3 py-2 text-gray-700 italic">&ldquo;{c.complaint_text}&rdquo;</td>
                        <td className="px-3 py-2 text-gray-700">{c.facet}</td>
                        <td className="px-3 py-2 text-gray-700">{c.sub_facet}</td>
                        <td className="px-3 py-2 text-gray-700">{c.indicator}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
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
            <p className="text-sm text-gray-500">No CPS-related complaints were raised in this session.</p>
          )}
        </div>
      )}

      {/* Recommendations */}
      {recs && (
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
          <h3 className="text-xs font-semibold text-gray-700">Recommendations</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <EvalSection title="For Next Session">
              <EvalList items={(recs.for_next_session || []) as string[]} />
            </EvalSection>
            <EvalSection title="For Prompt Tuning">
              <EvalList items={(recs.for_prompt_tuning || []) as string[]} />
            </EvalSection>
            <EvalSection title="For System Design">
              <EvalList items={(recs.for_system_design || []) as string[]} />
            </EvalSection>
          </div>
        </div>
      )}

      {/* Raw JSON toggle */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="text-xs text-gray-500 hover:text-gray-700 font-medium"
        >
          {showRaw ? "Hide" : "Show"} raw evaluation JSON
        </button>
        {showRaw && (
          <pre className="mt-1 text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-100 overflow-x-auto max-h-64 overflow-y-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
      <p className="text-lg font-semibold text-gray-900">{value}</p>
      <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">
        {label}
      </p>
    </div>
  );
}

function StageRegistryPanel({ stages }: { stages: Record<string, StageInfo> }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const stageEntries = Object.entries(stages).sort(
    ([, a], [, b]) => a.stage_number - b.stage_number
  );

  if (stageEntries.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-8">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">
        Stage Registry
      </h2>
      <div className="space-y-2">
        {stageEntries.map(([stageId, info]) => (
          <div key={stageId} className="border border-gray-100 rounded-lg">
            <button
              onClick={() =>
                setExpanded(expanded === stageId ? null : stageId)
              }
              className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                  {info.stage_number}
                </span>
                <span className="text-sm font-medium text-gray-800">
                  {stageId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </span>
              </div>
              <span className="text-xs text-gray-400">
                {expanded === stageId ? "collapse" : "expand"}
              </span>
            </button>
            {expanded === stageId && (
              <div className="px-3 pb-3 space-y-2">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                    Goal
                  </p>
                  <p className="text-sm text-gray-700">{info.goal}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                    Completion Criteria
                  </p>
                  <p className="text-sm text-gray-700">
                    {info.completion_criteria}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                    Max Turns
                  </p>
                  <p className="text-sm text-gray-700">{info.max_turns}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                    Next Stage
                  </p>
                  <p className="text-sm text-gray-700">
                    {info.next_stage || "None (final)"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                    System Prompt
                  </p>
                  <pre className="text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-100 overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {info.system_prompt}
                  </pre>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                    Raw JSON
                  </p>
                  <pre className="text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-100 overflow-x-auto max-h-48 overflow-y-auto">
                    {JSON.stringify(info, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InspectPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;
  const { user, isLoading: authLoading } = useAuth();

  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [stages, setStages] = useState<Record<string, StageInfo>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && sessionId) {
      loadData();
    }
  }, [user, sessionId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [sessionData, messagesData, stagesData] = await Promise.all([
        sessionsApi.get(sessionId),
        sessionsApi.getMessages(sessionId),
        stagesApi.get(),
      ]);
      setSession(sessionData);
      setMessages(messagesData);
      setStages(stagesData.stages);
    } catch (err) {
      console.error("Failed to load inspection data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Compute stats
  const assistantMessages = messages.filter((m) => m.role === "assistant");
  const turnCounts: Record<string, number> = {};
  assistantMessages.forEach((m) => {
    turnCounts[m.stage_id] = (turnCounts[m.stage_id] || 0) + 1;
  });

  const totalTurns = assistantMessages.length;
  const totalTokens = assistantMessages.reduce((sum, m) => {
    const usage = (m.llm_metadata as any)?.token_usage;
    return sum + (usage?.total || 0);
  }, 0);
  const avgResponseTime =
    assistantMessages.length > 0
      ? Math.round(
          assistantMessages.reduce(
            (sum, m) => sum + ((m.llm_metadata as any)?.response_time_ms || 0),
            0
          ) / assistantMessages.length
        )
      : 0;
  const forcedAdvances = assistantMessages.filter(
    (m) => (m.llm_metadata as any)?.forced_advance
  ).length;
  const fallbacks = assistantMessages.filter(
    (m) => (m.llm_metadata as any)?.attempt_number === 0
  ).length;

  const duration =
    session?.started_at && session?.completed_at
      ? Math.round(
          (new Date(session.completed_at).getTime() -
            new Date(session.started_at).getTime()) /
            60000
        )
      : null;

  if (authLoading || isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">Loading inspection data...</div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">Session not found.</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/dashboard")}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-lg font-semibold text-gray-900">
                Session Inspector
              </h1>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  session.status === "COMPLETED"
                    ? "bg-green-100 text-green-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {session.status}
              </span>
            </div>
            <span className="text-xs text-gray-400 font-mono">
              {session.id.slice(0, 8)}
            </span>
          </div>

          {/* Stage progress bar */}
          <StageProgressBar
            currentStage={session.current_stage}
            isCompleted={session.status === "COMPLETED"}
            turnCounts={turnCounts}
          />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          <StatCard label="Total Turns" value={String(totalTurns)} />
          <StatCard label="Total Tokens" value={totalTokens.toLocaleString()} />
          <StatCard
            label="Avg Response"
            value={`${(avgResponseTime / 1000).toFixed(1)}s`}
          />
          <StatCard label="Forced Advances" value={String(forcedAdvances)} />
          <StatCard label="Fallbacks" value={String(fallbacks)} />
          <StatCard
            label="Duration"
            value={duration ? `${duration}m` : "Active"}
          />
        </div>

        {/* Session metadata */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-8">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">
            Session Details
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-400 text-xs">Model</p>
              <p className="text-gray-700">{session.model_name}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Prompt Version</p>
              <p className="text-gray-700">{session.prompt_version}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Started</p>
              <p className="text-gray-700">
                {new Date(session.started_at).toLocaleString([], { timeZone: "America/New_York" })}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Completed</p>
              <p className="text-gray-700">
                {session.completed_at
                  ? new Date(session.completed_at).toLocaleString([], { timeZone: "America/New_York" })
                  : "---"}
              </p>
            </div>
          </div>
        </div>

        {/* Stage Registry — collapsible raw JSON */}
        <StageRegistryPanel stages={stages} />

        {/* Post-session evaluation (only shown for completed sessions with evaluation) */}
        {session.evaluation_data && (
          <SessionEvaluationPanel data={session.evaluation_data} />
        )}

        {/* Message timeline */}
        <h2 className="text-sm font-semibold text-gray-700 mb-4">
          Message Timeline ({messages.length} messages)
        </h2>
        <div className="space-y-4">
          {messages.map((msg, idx) => (
            <MessageCard
              key={msg.id}
              message={msg}
              stageInfo={stages[msg.stage_id] || null}
              mode="full"
              showStageBadge
              prevStageId={idx > 0 ? messages[idx - 1].stage_id : undefined}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
