"use client";

import React, { useState, useEffect } from "react";
import { BookOpen, AlertTriangle, ShieldCheck, ArrowRight, RotateCcw, Clock, CheckCircle2 } from "lucide-react";
import { fetchRunbooks } from "@/lib/api";

export default function RunbooksPage() {
  const [runbooks, setRunbooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRb, setSelectedRb] = useState<any>(null);

  const loadRunbooks = async () => {
    setLoading(true);
    try {
      const data = await fetchRunbooks();
      setRunbooks(data);
      if (data.length > 0) setSelectedRb(data[0]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRunbooks();
  }, []);

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case "HIGH":
        return <span className="bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA] text-[10px] font-medium px-2 py-0.5 rounded-full">High Risk</span>;
      case "MEDIUM":
        return <span className="bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] text-[10px] font-medium px-2 py-0.5 rounded-full">Medium Risk</span>;
      default:
        return <span className="bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0] text-[10px] font-medium px-2 py-0.5 rounded-full">Low Risk</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-6 shadow-card">
        <div>
          <h1 className="text-xl font-semibold text-[#242424]">Operational Runbook Library</h1>
          <p className="text-xs text-[#6B6B6B]">Deterministic procedures and automated remediation guides for SRE incidents</p>
        </div>
        <span className="text-xs text-[#6B6B6B] bg-[#FAFAF8] border border-[#E8E6E1] px-3 py-1.5 rounded-xl font-medium">
          {runbooks.length} Runbooks Available
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left List of Runbooks */}
        <div className="space-y-3">
          {runbooks.map((rb) => {
            const isSelected = selectedRb?.id === rb.id;
            return (
              <div
                key={rb.id}
                onClick={() => setSelectedRb(rb)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer bg-[#FFFFFF] shadow-subtle space-y-2 ${
                  isSelected ? "border-[#242424] ring-1 ring-[#242424]" : "border-[#E8E6E1] hover:border-[#8A8A8A]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-[#8A8A8A]">{rb.id}</span>
                  {getRiskBadge(rb.risk)}
                </div>

                <h3 className="font-semibold text-xs text-[#242424] leading-snug">{rb.title}</h3>

                <div className="text-[11px] text-[#6B6B6B] flex items-center justify-between pt-1 border-t border-[#E8E6E1]">
                  <span>{rb.historical_usage}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Detail Pane (Spec 32) */}
        {selectedRb && (
          <div className="lg:col-span-2 bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-6 shadow-card space-y-5">
            <div className="flex items-center justify-between border-b border-[#E8E6E1] pb-4">
              <div>
                <span className="text-xs font-mono text-[#8A8A8A]">{selectedRb.id}</span>
                <h2 className="text-lg font-semibold text-[#242424]">{selectedRb.title}</h2>
              </div>
              {getRiskBadge(selectedRb.risk)}
            </div>

            <div className="space-y-4 text-xs text-[#242424]">
              
              {/* Trigger */}
              <div className="p-3.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl space-y-1">
                <div className="font-semibold text-[#92400E] flex items-center gap-1.5 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5" /> Automated Trigger Condition
                </div>
                <div className="text-[#92400E] leading-relaxed">{selectedRb.trigger}</div>
              </div>

              {/* Step-by-Step Procedure */}
              <div className="space-y-2">
                <div className="font-semibold text-xs text-[#242424] uppercase tracking-wider">
                  Remediation Steps
                </div>
                <div className="space-y-2">
                  {selectedRb.steps?.map((st: string, idx: number) => (
                    <div key={idx} className="p-3 bg-[#FAFAF8] border border-[#E8E6E1] rounded-xl flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-[#242424] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="text-xs leading-relaxed text-[#242424]">{st}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Verification and Rollback */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl space-y-1">
                  <div className="font-semibold text-[#166534] flex items-center gap-1.5 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verification Criteria
                  </div>
                  <div className="text-[#166534] leading-relaxed">{selectedRb.verification}</div>
                </div>

                <div className="p-3.5 bg-[#FAFAF8] border border-[#E8E6E1] rounded-xl space-y-1">
                  <div className="font-semibold text-[#242424] flex items-center gap-1.5 text-xs">
                    <RotateCcw className="w-3.5 h-3.5" /> Rollback Strategy
                  </div>
                  <div className="text-[#6B6B6B] leading-relaxed">{selectedRb.rollback}</div>
                </div>
              </div>

              {/* Historical Usage */}
              <div className="p-3 bg-[#FAFAF8] border border-[#E8E6E1] rounded-xl text-[11px] text-[#6B6B6B] flex items-center justify-between">
                <span>Historical Operational Record:</span>
                <strong className="text-[#242424]">{selectedRb.historical_usage}</strong>
              </div>

            </div>
          </div>
        )}

      </div>

    </div>
  );
}
