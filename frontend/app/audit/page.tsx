"use client";

import React, { useState, useEffect } from "react";
import { ScrollText, RefreshCw, Filter, ShieldAlert, CheckCircle2, UserCheck, Play, Brain, Activity } from "lucide-react";
import { fetchAuditLogs } from "@/lib/api";

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState("ALL");

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await fetchAuditLogs();
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "INCIDENT_INJECTED":
        return <ShieldAlert className="w-4 h-4 text-[#DC2626]" />;
      case "INVESTIGATION_COMPLETED":
        return <Brain className="w-4 h-4 text-[#242424]" />;
      case "RECOMMENDATION_GENERATED":
        return <Activity className="w-4 h-4 text-[#D97706]" />;
      case "APPROVAL_ACCEPTED":
      case "HUMAN_CORRECTION_RETAINED":
        return <UserCheck className="w-4 h-4 text-[#16A34A]" />;
      case "VERIFICATION_PASSED":
        return <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />;
      default:
        return <ScrollText className="w-4 h-4 text-[#6B6B6B]" />;
    }
  };

  const filteredLogs = logs.filter(l => {
    if (filterAction === "ALL") return true;
    return l.action_type === filterAction;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-6 shadow-card">
        <div>
          <h1 className="text-xl font-semibold text-[#242424]">Autonomous Agent Audit Log</h1>
          <p className="text-xs text-[#6B6B6B]">Comprehensive audit trace of all reasoning steps, memory recalls, approvals, and verified remediations</p>
        </div>

        <button
          onClick={loadLogs}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FAFAF8] hover:bg-[#F4F3EE] border border-[#E8E6E1] text-[#242424] rounded-lg text-xs font-medium transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Audit Trail</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-4 shadow-card flex flex-wrap items-center gap-2">
        <span className="text-xs text-[#6B6B6B] mr-2">Filter Action:</span>
        {["ALL", "INCIDENT_INJECTED", "INVESTIGATION_COMPLETED", "RECOMMENDATION_GENERATED", "APPROVAL_ACCEPTED", "VERIFICATION_PASSED", "POSTMORTEM_RETAINED"].map((act) => (
          <button
            key={act}
            onClick={() => setFilterAction(act)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
              filterAction === act
                ? "bg-[#242424] text-white border-[#242424]"
                : "bg-[#FAFAF8] text-[#6B6B6B] border-[#E8E6E1] hover:text-[#242424]"
            }`}
          >
            {act.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {/* Audit Log Timeline (Spec 36) */}
      <div className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-6 shadow-card space-y-4">
        <div className="space-y-3">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="p-4 rounded-xl bg-[#FAFAF8] border border-[#E8E6E1] flex items-start gap-3.5 transition-colors hover:border-[#8A8A8A]"
            >
              <div className="p-2 bg-[#FFFFFF] border border-[#E8E6E1] rounded-lg shrink-0 mt-0.5">
                {getActionIcon(log.action_type)}
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#242424]">{log.action_type.replace(/_/g, " ")}</span>
                    {log.incident_id && (
                      <span className="text-[10px] font-mono text-[#6B6B6B] bg-[#FFFFFF] border border-[#E8E6E1] px-1.5 py-0.2 rounded">
                        {log.incident_id}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-[#8A8A8A]">{log.time_display || log.timestamp}</span>
                </div>

                <p className="text-xs text-[#6B6B6B] leading-relaxed">{log.summary}</p>
                <div className="text-[10px] text-[#8A8A8A] pt-0.5">
                  Actor: <strong className="text-[#242424]">{log.actor || "AGENT"}</strong> • Audit Event ID: {log.id}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
