"use client";

import React from "react";
import { Activity, CheckCircle2, Clock, ShieldCheck, ChevronRight } from "lucide-react";

interface TraceProps {
  status: string;
  timeline: any[];
}

const STAGES = [
  { id: "INCIDENT_DETECTED", label: "Detection" },
  { id: "INVESTIGATING", label: "Investigation & Recall" },
  { id: "RECOMMENDATION_READY", label: "Recommendation" },
  { id: "WAITING_FOR_APPROVAL", label: "Human Approval" },
  { id: "ACTION_EXECUTING", label: "Safe Execution" },
  { id: "VERIFYING", label: "Verification" },
  { id: "RESOLVED", label: "Postmortem & Retain" },
];

export default function AgentReasoningTrace({ status, timeline }: TraceProps) {
  const getStageIndex = (currentStatus: string) => {
    switch (currentStatus) {
      case "INCIDENT_DETECTED": return 0;
      case "INVESTIGATING": return 1;
      case "ROOT_CAUSE_IDENTIFIED": return 1;
      case "RECOMMENDATION_READY": return 2;
      case "WAITING_FOR_APPROVAL": return 3;
      case "HUMAN_CORRECTION": return 3;
      case "ACTION_EXECUTING": return 4;
      case "VERIFYING": return 5;
      case "RESOLVED": return 6;
      case "POSTMORTEM_CREATED": return 6;
      case "LEARNING_RETAINED": return 6;
      default: return 0;
    }
  };

  const currentIndex = getStageIndex(status);

  return (
    <div className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-5 shadow-card space-y-4">
      <div className="flex items-center justify-between border-b border-[#E8E6E1] pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#242424]" />
          <h3 className="font-semibold text-sm text-[#242424]">Incident Lifecycle State Machine</h3>
        </div>
        <span className="text-[11px] font-mono font-medium bg-[#FAFAF8] text-[#242424] border border-[#E8E6E1] px-2.5 py-0.5 rounded-md">
          {status}
        </span>
      </div>

      {/* Lifecycle Progress Stepper */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {STAGES.map((s, idx) => {
          const isDone = idx < currentIndex || status === "RESOLVED" || status === "POSTMORTEM_CREATED";
          const isCurrent = idx === currentIndex && status !== "RESOLVED" && status !== "POSTMORTEM_CREATED";

          return (
            <div
              key={s.id}
              className={`p-2.5 rounded-xl border text-center transition-all ${
                isCurrent
                  ? "bg-[#FAFAF8] border-[#242424] text-[#242424] font-semibold shadow-subtle"
                  : isDone
                  ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]"
                  : "bg-[#FFFFFF] border-[#E8E6E1] text-[#8A8A8A]"
              }`}
            >
              <div className="text-[10px] font-medium flex items-center justify-center gap-1">
                {isDone ? (
                  <CheckCircle2 className="w-3 h-3 text-[#16A34A]" />
                ) : isCurrent ? (
                  <Clock className="w-3 h-3 text-[#242424] animate-spin" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-[#E8E6E1]" />
                )}
                <span>Step {idx + 1}</span>
              </div>
              <div className="text-[11px] font-medium truncate mt-0.5">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Live Timeline Audit Log */}
      <div className="space-y-2 pt-1">
        <h4 className="text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider">
          Incident Event Audit Trail
        </h4>
        <div className="bg-[#FAFAF8] border border-[#E8E6E1] rounded-xl p-3.5 text-xs space-y-2 max-h-48 overflow-y-auto">
          {timeline && timeline.length > 0 ? (
            timeline.map((item: any, i: number) => (
              <div key={i} className="flex items-start gap-2.5 border-b border-[#E8E6E1]/60 pb-1.5 last:border-b-0 last:pb-0 text-[#242424]">
                <span className="text-[#8A8A8A] font-mono text-[11px] shrink-0">[{item.timestamp}]</span>
                <span className="bg-[#FFFFFF] text-[#242424] border border-[#E8E6E1] px-1.5 py-0.2 rounded text-[10px] font-medium shrink-0">
                  {item.stage}
                </span>
                <span className="text-xs leading-relaxed">{item.message}</span>
              </div>
            ))
          ) : (
            <div className="text-[#8A8A8A] italic">No timeline events recorded yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
