"use client";

import React from "react";

const STAGE_LABELS: Record<string, string> = {
  welcome: "Welcome",
  recall_experience: "Experience",
  observe_dynamics: "Dynamics",
  make_meaning: "Meaning",
  plan_experiment: "Experiment",
  wrap_up: "Wrap Up",
};

const STAGE_ORDER = [
  "welcome",
  "recall_experience",
  "observe_dynamics",
  "make_meaning",
  "plan_experiment",
  "wrap_up",
];

interface StageProgressBarProps {
  currentStage: string;
  isCompleted: boolean;
  /** Turn counts per stage, e.g. { welcome: 2, recall_experience: 4 } */
  turnCounts?: Record<string, number>;
  compact?: boolean;
}

export default function StageProgressBar({
  currentStage,
  isCompleted,
  turnCounts = {},
  compact = false,
}: StageProgressBarProps) {
  const currentIdx = STAGE_ORDER.indexOf(currentStage);

  return (
    <div className="w-full">
      <div className="flex items-center gap-1">
        {STAGE_ORDER.map((stage, idx) => {
          const isPast = isCompleted || idx < currentIdx;
          const isCurrent = !isCompleted && idx === currentIdx;
          const isFuture = !isCompleted && idx > currentIdx;
          const turns = turnCounts[stage] || 0;

          return (
            <React.Fragment key={stage}>
              {/* Stage pill */}
              <div className="flex flex-col items-center flex-1 min-w-0">
                <div
                  className={`w-full h-2 rounded-full transition-colors ${
                    isPast
                      ? "bg-green-500"
                      : isCurrent
                      ? "bg-blue-500 animate-pulse"
                      : "bg-gray-200"
                  }`}
                />
                {!compact && (
                  <div className="mt-1.5 text-center">
                    <p
                      className={`text-[10px] font-medium leading-tight ${
                        isPast
                          ? "text-green-700"
                          : isCurrent
                          ? "text-blue-700"
                          : "text-gray-400"
                      }`}
                    >
                      {STAGE_LABELS[stage] || stage}
                    </p>
                    {turns > 0 && (
                      <p className="text-[9px] text-gray-400 mt-0.5">
                        {turns} turn{turns !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>
      {compact && (
        <p className="text-xs text-gray-500 mt-1">
          {isCompleted
            ? "Completed"
            : `Stage ${currentIdx + 1}/6 — ${STAGE_LABELS[currentStage] || currentStage}`}
        </p>
      )}
    </div>
  );
}

