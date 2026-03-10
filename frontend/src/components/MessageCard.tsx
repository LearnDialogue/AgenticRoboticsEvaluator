"use client";

import React, { useState } from "react";
import MetadataPanel from "./MetadataPanel";

interface Message {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  stage_id: string;
  llm_metadata?: Record<string, unknown> | null;
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

interface MessageCardProps {
  message: Message;
  stageInfo?: StageInfo | null;
  mode: "compact" | "full";
  showStageBadge?: boolean;
  prevStageId?: string;
}

export default function MessageCard({
  message,
  stageInfo,
  mode,
  showStageBadge = false,
  prevStageId,
}: MessageCardProps) {
  const [expanded, setExpanded] = useState(mode === "full");
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const hasMetadata = isAssistant && message.llm_metadata;
  const stageChanged = prevStageId !== undefined && prevStageId !== message.stage_id;

  return (
    <div className="group">
      {/* Stage transition divider */}
      {showStageBadge && stageChanged && (
        <div className="flex items-center gap-2 my-4">
          <div className="flex-1 h-px bg-blue-200" />
          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            → {message.stage_id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </span>
          <div className="flex-1 h-px bg-blue-200" />
        </div>
      )}

      <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
        <div className={`max-w-[85%] ${mode === "full" ? "w-full max-w-none" : ""}`}>
          {/* Message bubble */}
          <div
            className={`${
              isUser
                ? "bg-blue-500 text-white rounded-2xl rounded-br-sm"
                : "bg-gray-100 text-gray-900 rounded-2xl rounded-bl-sm"
            } px-4 py-2.5 ${
              hasMetadata && mode === "compact" ? "cursor-pointer" : ""
            }`}
            onClick={() => {
              if (hasMetadata && mode === "compact") setExpanded(!expanded);
            }}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>

            {/* Timestamp + click hint */}
            <div
              className={`flex items-center gap-2 mt-1 text-[10px] ${
                isUser ? "text-blue-200" : "text-gray-400"
              }`}
            >
              <span>
                {new Date(message.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "America/New_York",
                })}
              </span>
              {hasMetadata && mode === "compact" && !expanded && (
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                  click to inspect
                </span>
              )}
            </div>
          </div>

          {/* Metadata panel (expandable in compact, always shown in full) */}
          {hasMetadata && expanded && (
            <div className="mt-2">
              <MetadataPanel
                metadata={message.llm_metadata as any}
                stageInfo={stageInfo}
                mode={mode}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
