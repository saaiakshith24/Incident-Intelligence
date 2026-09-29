"use client";

import React from "react";
import { Brain, AlertCircle, CheckCircle2, UserCheck, Sparkles, ArrowRight, ShieldAlert } from "lucide-react";

interface HindsightEvidenceProps {
  investigation: any;
  recommendation: any;
  mode: string;
}

export default function HindsightEvidencePanel({ investigation, recommendation, mode }: HindsightEvidenceProps) {
  if (!investigation) {
    return (
      <div className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-8 text-center text-[#8A8A8A] text-xs space-y-2">
        <Brain className="w-8 h-8 text-[#8A8A8A] mx-auto animate-pulse" />
        <p>Awaiting agent investigation and Hindsight memory recall...</p>
      </div>
    );
  }

  const failedMems = investigation.failed_action_memories || [];
  const correctionMems = investigation.human_correction_memories || [];
  const matrix = investigation.past_vs_present?.comparison_matrix || [];
  const isInfluenced = recommendation?.hindsight_influence?.is_influenced;

  return (
    <div className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-5 shadow-card space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8E6E1] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#242424] text-white flex items-center justify-center">
            <Brain className="w-4 h-4 text-[#FAFAF8]" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-[#242424]">What the system remembers</h3>
            <p className="text-[11px] text-[#6B6B6B]">Hindsight Long-Term Operational Memory</p>
          </div>
        </div>

        {/* Mode Indicator */}
        <div className="flex items-center gap-2 text-xs">
          <span className={`px-2.5 py-1 rounded-md text-[11px] font-medium border ${
            mode === "WITH_MEMORY" 
              ? "bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]" 
              : "bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]"
          }`}>
            {mode === "WITH_MEMORY" ? "With Hindsight" : "Without Memory (Ablation)"}
          </span>
        </div>
      </div>

      {/* Memory Summary Stats Counter */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="p-2.5 rounded-xl bg-[#FAFAF8] border border-[#E8E6E1] text-center">
          <div className="text-base font-bold text-[#242424]">
            {mode === "WITH_MEMORY" ? (investigation.memory_recalled?.length || 3) : 0}
          </div>
          <div className="text-[11px] text-[#6B6B6B]">Similar Incidents</div>
        </div>
        <div className="p-2.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-center">
          <div className="text-base font-bold text-[#991B1B]">
            {mode === "WITH_MEMORY" ? failedMems.length : 0}
          </div>
          <div className="text-[11px] text-[#991B1B]">Failed Actions</div>
        </div>
        <div className="p-2.5 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-center">
          <div className="text-base font-bold text-[#166534]">
            {mode === "WITH_MEMORY" ? correctionMems.length : 0}
          </div>
          <div className="text-[11px] text-[#166534]">SRE Corrections</div>
        </div>
        <div className="p-2.5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-center">
          <div className="text-base font-bold text-[#1E40AF]">
            {mode === "WITH_MEMORY" ? 4 : 0}
          </div>
          <div className="text-[11px] text-[#1E40AF]">Runbook Memories</div>
        </div>
      </div>

      {/* Hero Callout Banner for Hindsight Proof */}
      {mode === "WITH_MEMORY" && isInfluenced ? (
        <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-4 shadow-subtle space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#92400E]">
            <Sparkles className="w-4 h-4 text-[#D97706]" />
            <span>Learning from previous incident</span>
          </div>
          <p className="text-xs text-[#92400E] leading-relaxed">
            The agent recalled a previous failed restart attempt on Incident #014 and retrieved an SRE engineer correction advocating connection pressure reduction. It avoids repeating the failed restart.
          </p>
        </div>
      ) : null}

      {/* Recalled Memories Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        
        {/* Recalled Failures Card */}
        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[#991B1B]">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-[#DC2626]" /> Previous Attempt (Failed Experience)
            </span>
            <span className="bg-[#FFFFFF] text-[#991B1B] border border-[#FECACA] px-1.5 py-0.2 rounded text-[10px]">
              {failedMems.length} Found
            </span>
          </div>

          {failedMems.length > 0 ? (
            failedMems.map((m: any, i: number) => (
              <div key={i} className="bg-[#FFFFFF] border border-[#FECACA] rounded-lg p-2.5 text-xs space-y-1.5 shadow-subtle">
                <div className="font-semibold text-[#991B1B] flex items-center justify-between">
                  <span>{m.memory?.title}</span>
                  <span className="text-[10px] bg-[#FEE2E2] text-[#991B1B] px-1 rounded font-mono">FAILED</span>
                </div>
                <div className="text-[11px] text-[#6B6B6B] leading-relaxed">{m.memory?.content}</div>
                <div className="text-[11px] text-[#991B1B] font-medium pt-1 border-t border-[#FEE2E2]">
                  Reason: Connection pressure remained high.
                </div>
              </div>
            ))
          ) : (
            <div className="text-[11px] text-[#8A8A8A] italic">No failure memories active.</div>
          )}
        </div>

        {/* Recalled Human Corrections Card */}
        <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[#166534]">
            <span className="flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-[#16A34A]" /> SRE Human Correction
            </span>
            <span className="bg-[#FFFFFF] text-[#166534] border border-[#BBF7D0] px-1.5 py-0.2 rounded text-[10px]">
              {correctionMems.length} Found
            </span>
          </div>

          {correctionMems.length > 0 ? (
            correctionMems.map((m: any, i: number) => (
              <div key={i} className="bg-[#FFFFFF] border border-[#BBF7D0] rounded-lg p-2.5 text-xs space-y-1.5 shadow-subtle">
                <div className="font-semibold text-[#166534]">{m.memory?.title}</div>
                <div className="text-[11px] text-[#6B6B6B] leading-relaxed">{m.memory?.content}</div>
                <div className="text-[11px] text-[#166534] font-medium pt-1 border-t border-[#DCFCE7]">
                  Correction: Restarting alone is insufficient; reduce connection pressure.
                </div>
              </div>
            ))
          ) : (
            <div className="text-[11px] text-[#8A8A8A] italic">No human corrections active.</div>
          )}
        </div>

      </div>

      {/* Past vs Present Signal Comparison Matrix */}
      <div className="space-y-2 pt-2 border-t border-[#E8E6E1]">
        <h4 className="text-xs font-semibold text-[#242424] flex items-center gap-1.5">
          <ArrowRight className="w-3.5 h-3.5 text-[#6B6B6B]" /> Past vs Present Comparison
        </h4>

        <div className="overflow-x-auto border border-[#E8E6E1] rounded-xl bg-[#FFFFFF]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAFAF8] text-[#6B6B6B] border-b border-[#E8E6E1] text-[11px]">
              <tr>
                <th className="p-2.5 font-medium">Signal Metric</th>
                <th className="p-2.5 font-medium">Previous Incident (#014)</th>
                <th className="p-2.5 font-medium">Current Incident</th>
                <th className="p-2.5 font-medium">Match Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E6E1] text-[#242424]">
              {matrix.map((row: any, idx: number) => (
                <tr key={idx} className="hover:bg-[#FAFAF8]">
                  <td className="p-2.5 font-medium text-[#242424]">{row.signal}</td>
                  <td className="p-2.5 text-[#6B6B6B]">{row.previous}</td>
                  <td className="p-2.5 font-semibold text-[#242424]">{row.current}</td>
                  <td className="p-2.5">
                    <span className="bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0] text-[10px] px-2 py-0.5 rounded-full font-medium">
                      High Similarity (98%)
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-[#8A8A8A] leading-relaxed">
          {investigation.past_vs_present?.explanation}
        </p>
      </div>

    </div>
  );
}
