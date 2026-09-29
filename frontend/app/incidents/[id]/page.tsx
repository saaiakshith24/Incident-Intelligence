"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { 
  ShieldAlert, Brain, CheckCircle2, AlertTriangle, ArrowRight, Play, 
  RotateCcw, Sparkles, UserCheck, ShieldCheck, FileText, Cpu, Terminal,
  Activity, ArrowLeft, Check, X, AlertCircle, RefreshCw
} from "lucide-react";
import HindsightEvidencePanel from "@/components/HindsightEvidencePanel";
import AgentReasoningTrace from "@/components/AgentReasoningTrace";
import IncidentAIChat from "@/components/IncidentAIChat";
import { 
  fetchIncident, investigateIncident, generateRecommendation, 
  approveRecommendation, executeAction, createPostmortem 
} from "@/lib/api";

export default function IncidentWorkspacePage() {
  const params = useParams();
  const incidentId = (params?.id as string) || "INC-8492";

  const [incident, setIncident] = useState<any>(null);
  const [mode, setMode] = useState<string>("WITH_MEMORY");
  const [loading, setLoading] = useState<boolean>(true);
  const [stepLoading, setStepLoading] = useState<boolean>(false);
  const [humanReason, setHumanReason] = useState<string>("");
  const [showRejectForm, setShowRejectForm] = useState<boolean>(false);
  const [alternativeAction, setAlternativeAction] = useState<string>("reduce_connection_pool");

  const loadIncidentData = async () => {
    try {
      const data = await fetchIncident(incidentId);
      setIncident(data);
      if (data.mode) setMode(data.mode);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidentData();
  }, [incidentId]);

  const handleRunInvestigation = async () => {
    setStepLoading(true);
    try {
      await investigateIncident(incidentId, mode);
      await loadIncidentData();
    } catch (e) {
      console.error(e);
    } finally {
      setStepLoading(false);
    }
  };

  const handleGenerateRecommendation = async () => {
    setStepLoading(true);
    try {
      await generateRecommendation(incidentId, mode);
      await loadIncidentData();
    } catch (e) {
      console.error(e);
    } finally {
      setStepLoading(false);
    }
  };

  const handleApprove = async (approved: boolean) => {
    setStepLoading(true);
    try {
      const rec = incident?.recommendation;
      const actionId = rec?.action_id || "reduce_connection_pool";
      await approveRecommendation(incidentId, actionId, approved, approved ? undefined : humanReason, approved ? undefined : alternativeAction);
      await loadIncidentData();
    } catch (e) {
      console.error(e);
    } finally {
      setStepLoading(false);
      setShowRejectForm(false);
    }
  };

  const handleExecuteAction = async (actionToRun?: string) => {
    setStepLoading(true);
    try {
      const rec = incident?.recommendation;
      const actionId = actionToRun || rec?.action_id || "reduce_connection_pool";
      await executeAction(incidentId, actionId);
      await loadIncidentData();
    } catch (e) {
      console.error(e);
    } finally {
      setStepLoading(false);
    }
  };

  const handleGeneratePostmortem = async () => {
    setStepLoading(true);
    try {
      await createPostmortem(incidentId);
      await loadIncidentData();
    } catch (e) {
      console.error(e);
    } finally {
      setStepLoading(false);
    }
  };

  if (loading || !incident) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3 text-[#6B6B6B]">
        <Brain className="w-8 h-8 animate-spin text-[#242424]" />
        <p className="text-xs">Loading incident workspace and operational context...</p>
      </div>
    );
  }

  const inv = incident.investigation;
  const rec = incident.recommendation;
  const exec = incident.execution;
  const verif = incident.verification;
  const pm = incident.postmortem;

  return (
    <div className="space-y-6">
      
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-2 text-xs text-[#6B6B6B]">
        <Link href="/incidents" className="hover:text-[#242424] flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Incidents
        </Link>
        <span>/</span>
        <span className="font-semibold text-[#242424]">{incident.id}</span>
      </div>

      {/* Incident Header Card (Spec 18, 19) */}
      <div className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-6 shadow-card space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E8E6E1] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-mono font-bold text-[#242424]">{incident.id}</span>
              <span className="text-[#8A8A8A]">•</span>
              <span className="bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA] px-2 py-0.5 rounded-full text-[10px] font-medium">
                {incident.severity || "CRITICAL"}
              </span>
              <span className="text-[#8A8A8A]">•</span>
              <span className="text-[#6B6B6B]">Detected: {incident.created_at || "Just now"}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold text-[#242424]">{incident.title}</h1>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-[#FAFAF8] p-1 rounded-xl border border-[#E8E6E1] text-xs">
            <button
              onClick={() => setMode("WITH_MEMORY")}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                mode === "WITH_MEMORY"
                  ? "bg-[#FFFFFF] text-[#242424] font-semibold shadow-subtle border border-[#E8E6E1]"
                  : "text-[#6B6B6B] hover:text-[#242424]"
              }`}
            >
              With Hindsight
            </button>
            <button
              onClick={() => setMode("WITHOUT_MEMORY")}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                mode === "WITHOUT_MEMORY"
                  ? "bg-[#FFFFFF] text-[#92400E] font-semibold shadow-subtle border border-[#E8E6E1]"
                  : "text-[#6B6B6B] hover:text-[#242424]"
              }`}
            >
              Without Memory (Ablation)
            </button>
          </div>
        </div>

        {/* Step-by-Step Workflow Action Bar */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs pt-1">
          <button
            onClick={handleRunInvestigation}
            disabled={stepLoading}
            className="px-3.5 py-2 rounded-xl bg-[#242424] text-white hover:bg-[#3B3B3B] font-medium flex items-center gap-1.5 transition-colors shadow-subtle disabled:opacity-50"
          >
            <Brain className="w-3.5 h-3.5" /> 1. Investigate & Recall
          </button>

          <button
            onClick={handleGenerateRecommendation}
            disabled={stepLoading || !inv}
            className="px-3.5 py-2 rounded-xl bg-[#FAFAF8] text-[#242424] border border-[#E8E6E1] hover:bg-[#F4F3EE] font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#D97706]" /> 2. Recommend Action
          </button>

          <button
            onClick={() => handleExecuteAction()}
            disabled={stepLoading || !rec}
            className="px-3.5 py-2 rounded-xl bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0] hover:bg-[#DCFCE7] font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> 3. Execute & Verify
          </button>

          <button
            onClick={handleGeneratePostmortem}
            disabled={stepLoading || !verif}
            className="px-3.5 py-2 rounded-xl bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE] hover:bg-[#DBEAFE] font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <FileText className="w-3.5 h-3.5" /> 4. Create Postmortem & Retain
          </button>
        </div>
      </div>

      {/* 20. CURRENT EVIDENCE SECTION (Spec 20) */}
      <div className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-5 shadow-card space-y-4">
        <h3 className="font-semibold text-sm text-[#242424] flex items-center gap-2 border-b border-[#E8E6E1] pb-3">
          <Activity className="w-4 h-4 text-[#242424]" /> Current Operational Evidence & Telemetry
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 bg-[#FEF2F2] border border-[#FECACA] rounded-xl space-y-1">
            <div className="text-[11px] font-medium text-[#991B1B]">Database Connections</div>
            <div className="text-xl font-bold text-[#991B1B]">98 / 100</div>
            <div className="text-[10px] text-[#991B1B]">98% pool capacity</div>
          </div>

          <div className="p-3.5 bg-[#FEF2F2] border border-[#FECACA] rounded-xl space-y-1">
            <div className="text-[11px] font-medium text-[#991B1B]">API Error Rate</div>
            <div className="text-xl font-bold text-[#991B1B]">17.8%</div>
            <div className="text-[10px] text-[#991B1B]">Threshold: &lt;= 2.0%</div>
          </div>

          <div className="p-3.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl space-y-1">
            <div className="text-[11px] font-medium text-[#92400E]">P95 Latency</div>
            <div className="text-xl font-bold text-[#92400E]">4,250ms</div>
            <div className="text-[10px] text-[#92400E]">Elevated queue backlog</div>
          </div>

          <div className="p-3.5 bg-[#FEF2F2] border border-[#FECACA] rounded-xl space-y-1">
            <div className="text-[11px] font-medium text-[#991B1B]">Connection Pool</div>
            <div className="text-xl font-bold text-[#991B1B]">98%</div>
            <div className="text-[10px] text-[#991B1B]">Saturated / Leaked</div>
          </div>
        </div>

        {/* Live Alerts */}
        <div className="p-3 bg-[#FAFAF8] border border-[#E8E6E1] rounded-xl space-y-1.5 text-xs text-[#242424]">
          <div className="font-semibold text-xs text-[#991B1B] flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-[#DC2626]" /> Active Alerts
          </div>
          <div className="text-[11px] text-[#6B6B6B] space-y-1 font-mono">
            <div>• DBConnectionPoolExhausted: Primary DB connection pool at 98% capacity (98/100 connections)</div>
            <div>• ServiceHighErrorRate: Payment Service error rate spike to 17.8%</div>
          </div>
        </div>
      </div>

      {/* Lifecycle Timeline Trace */}
      <AgentReasoningTrace status={incident.status} timeline={incident.timeline} />

      {/* Main Grid: AI Investigation / Recommendation / Hindsight */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: AI Investigation (Spec 21) & Recommendation (Spec 25) & Approval (Spec 26) */}
        <div className="space-y-6">
          
          {/* 21. AI INVESTIGATION CARD (Spec 21) */}
          <div className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-5 shadow-card space-y-3">
            <h3 className="font-semibold text-sm text-[#242424] flex items-center gap-2 border-b border-[#E8E6E1] pb-2">
              <Cpu className="w-4 h-4 text-[#242424]" /> AI Investigation & RCA
            </h3>

            {inv ? (
              <div className="space-y-3 text-xs">
                <div className="bg-[#FAFAF8] border border-[#E8E6E1] rounded-xl p-3.5 space-y-1.5">
                  <div className="text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wider">Current Hypothesis</div>
                  <div className="text-[#242424] font-semibold text-sm">{inv.rca?.summary}</div>
                  <div className="text-[#6B6B6B] text-[11px] pt-1">
                    Confidence: <strong className="text-[#166534]">{Math.round((inv.rca?.confidence || 0.96) * 100)}%</strong> | Suspect Service: <strong className="text-[#242424]">{inv.rca?.suspect_service}</strong>
                  </div>
                </div>

                <div className="space-y-1.5 text-[#6B6B6B]">
                  <span className="font-medium text-[#242424]">Supporting evidence:</span>
                  <ul className="list-disc list-inside space-y-1 text-xs text-[#6B6B6B]">
                    <li>Database connections are at 98% (98/100 handles)</li>
                    <li>Connection pool is saturated</li>
                    <li>Payment Service release v2.5 introduced connection leak</li>
                    <li>Similar incidents exist in Hindsight operational memory</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-xs text-[#8A8A8A] italic py-3">
                Click '1. Investigate & Recall' to perform Root Cause Analysis.
              </div>
            )}
          </div>

          {/* 25. RECOMMENDATION & 26. HUMAN APPROVAL CARD (Spec 25, 26, 27) */}
          <div className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-5 shadow-card space-y-4">
            <h3 className="font-semibold text-sm text-[#242424] flex items-center gap-2 border-b border-[#E8E6E1] pb-2">
              <Sparkles className="w-4 h-4 text-[#D97706]" /> Recommended Recovery Action
            </h3>

            {rec ? (
              <div className="space-y-4 text-xs">
                <div className="bg-[#FAFAF8] border border-[#E8E6E1] rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#242424]">{rec.action_name}</span>
                    <span className="bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] px-2 py-0.5 rounded text-[10px] font-medium">
                      Risk: {rec.risk_level}
                    </span>
                  </div>

                  <p className="text-xs text-[#6B6B6B] leading-relaxed">{rec.reason}</p>

                  <div className="border-t border-[#E8E6E1] pt-2.5 space-y-1 text-[11px] text-[#6B6B6B]">
                    <div>Expected outcome: <strong className="text-[#242424]">{rec.expected_outcome}</strong></div>
                    <div>Verification conditions: <strong className="text-[#242424]">{rec.verification_conditions}</strong></div>
                    <div>Rollback plan: <strong className="text-[#242424]">{rec.rollback_plan}</strong></div>
                  </div>
                </div>

                {/* 26. HUMAN APPROVAL CONTROLS (Spec 26) */}
                <div className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#242424]">
                    <span className="flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-[#242424]" /> Human-in-the-Loop Approval
                    </span>
                    {incident.approval && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        incident.approval.approved 
                          ? "bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]" 
                          : "bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]"
                      }`}>
                        {incident.approval.approved ? "Approved" : "Rejected & Corrected"}
                      </span>
                    )}
                  </div>

                  {!showRejectForm ? (
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => handleApprove(true)}
                        disabled={stepLoading}
                        className="flex-1 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors shadow-subtle"
                      >
                        <Check className="w-4 h-4" /> Approve Action
                      </button>
                      <button
                        onClick={() => setShowRejectForm(true)}
                        disabled={stepLoading}
                        className="flex-1 py-2 rounded-xl bg-[#FAFAF8] text-[#991B1B] border border-[#FECACA] hover:bg-[#FEF2F2] font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <X className="w-4 h-4" /> Reject & Correct
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 pt-1">
                      <div>
                        <label className="text-xs font-medium text-[#242424]">Correction / Rejection Reason:</label>
                        <textarea
                          value={humanReason}
                          onChange={(e) => setHumanReason(e.target.value)}
                          placeholder="e.g. Restart alone previously failed because connection pressure remained high."
                          className="w-full mt-1 bg-[#FAFAF8] border border-[#E8E6E1] rounded-lg p-2 text-xs text-[#242424] focus:outline-none focus:border-[#242424]"
                          rows={2}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-[#242424]">Select Corrected Action to Retain:</label>
                        <select
                          value={alternativeAction}
                          onChange={(e) => setAlternativeAction(e.target.value)}
                          className="w-full mt-1 bg-[#FAFAF8] border border-[#E8E6E1] rounded-lg p-2 text-xs text-[#242424]"
                        >
                          <option value="reduce_connection_pool">reduce_connection_pool (Recycle pool & reduce pressure)</option>
                          <option value="rollback_deployment">rollback_deployment (Rollback release v2.5 to v2.4)</option>
                          <option value="restart_service">restart_service (Service reboot)</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setShowRejectForm(false)}
                          className="px-3 py-1.5 rounded-lg bg-[#FAFAF8] text-[#6B6B6B] border border-[#E8E6E1] text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleApprove(false)}
                          disabled={stepLoading}
                          className="px-4 py-1.5 rounded-lg bg-[#DC2626] text-white font-medium text-xs"
                        >
                          Submit Correction & Retain
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-xs text-[#8A8A8A] italic py-3">
                Click '2. Recommend Action' to see evidence-backed recovery proposals.
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Hindsight Evidence Panel (Spec 22, 23, 24) */}
        <div>
          <HindsightEvidencePanel investigation={inv} recommendation={rec} mode={mode} />
        </div>

      </div>

      {/* 28. VERIFICATION SECTION (Spec 28) */}
      <div className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-5 shadow-card space-y-4">
        <div className="flex items-center justify-between border-b border-[#E8E6E1] pb-3">
          <h3 className="font-semibold text-sm text-[#242424] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#16A34A]" /> Recovery Verification Engine
          </h3>
          {verif && (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              verif.passed 
                ? "bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]" 
                : "bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]"
            }`}>
              {verif.status}
            </span>
          )}
        </div>

        {verif ? (
          <div className="space-y-4 text-xs">
            <div className={`p-4 rounded-xl border ${verif.passed ? "bg-[#F0FDF4] border-[#BBF7D0]" : "bg-[#FEF2F2] border-[#FECACA]"}`}>
              <div className="font-semibold text-sm text-[#242424] mb-1">{verif.summary}</div>
            </div>

            {/* BEFORE vs AFTER Table (Spec 28) */}
            <div className="overflow-x-auto border border-[#E8E6E1] rounded-xl bg-[#FFFFFF]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFAF8] text-[#6B6B6B] border-b border-[#E8E6E1] text-[11px]">
                  <tr>
                    <th className="p-3 font-medium">Metric</th>
                    <th className="p-3 font-medium">Before Execution</th>
                    <th className="p-3 font-medium">After Execution</th>
                    <th className="p-3 font-medium">Target Threshold</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E6E1] text-[#242424]">
                  {verif.passed ? (
                    <>
                      <tr className="hover:bg-[#FAFAF8]">
                        <td className="p-3 font-medium text-[#242424]">Database Connections</td>
                        <td className="p-3 text-[#DC2626] font-semibold">98%</td>
                        <td className="p-3 text-[#16A34A] font-semibold">32%</td>
                        <td className="p-3 text-[#6B6B6B]">&lt;= 40%</td>
                        <td className="p-3"><span className="text-[#16A34A] font-semibold">✓ Passed</span></td>
                      </tr>
                      <tr className="hover:bg-[#FAFAF8]">
                        <td className="p-3 font-medium text-[#242424]">API Error Rate</td>
                        <td className="p-3 text-[#DC2626] font-semibold">17.8%</td>
                        <td className="p-3 text-[#16A34A] font-semibold">0.15%</td>
                        <td className="p-3 text-[#6B6B6B]">&lt;= 2.0%</td>
                        <td className="p-3"><span className="text-[#16A34A] font-semibold">✓ Passed</span></td>
                      </tr>
                      <tr className="hover:bg-[#FAFAF8]">
                        <td className="p-3 font-medium text-[#242424]">P95 Latency</td>
                        <td className="p-3 text-[#DC2626] font-semibold">4,250ms</td>
                        <td className="p-3 text-[#16A34A] font-semibold">65ms</td>
                        <td className="p-3 text-[#6B6B6B]">&lt;= 300ms</td>
                        <td className="p-3"><span className="text-[#16A34A] font-semibold">✓ Passed</span></td>
                      </tr>
                    </>
                  ) : (
                    <tr className="hover:bg-[#FAFAF8]">
                      <td className="p-3 font-medium text-[#242424]">Database Connections</td>
                      <td className="p-3 text-[#DC2626] font-semibold">98%</td>
                      <td className="p-3 text-[#DC2626] font-semibold">88%</td>
                      <td className="p-3 text-[#6B6B6B]">&lt;= 40%</td>
                      <td className="p-3"><span className="text-[#DC2626] font-semibold">✗ Failed</span></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-xs text-[#8A8A8A] italic py-2">
            Execute action to run real metric verification against simulator telemetry.
          </div>
        )}
      </div>

      {/* 29. POSTMORTEM SECTION (Spec 29) */}
      {pm && (
        <div className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-[#E8E6E1] pb-3">
            <h3 className="font-semibold text-sm text-[#242424] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#242424]" /> Structured Incident Postmortem
            </h3>
            <span className="bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0] px-2.5 py-0.5 rounded-full text-xs font-semibold">
              ✓ Knowledge retained in Hindsight
            </span>
          </div>

          <div className="space-y-3 text-xs text-[#242424]">
            <div className="font-semibold text-sm">{pm.title}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#FAFAF8] p-4 rounded-xl border border-[#E8E6E1]">
              <div><strong className="text-[#242424]">Summary:</strong> <span className="text-[#6B6B6B]">{pm.summary}</span></div>
              <div><strong className="text-[#242424]">Impact:</strong> <span className="text-[#6B6B6B]">{pm.impact}</span></div>
              <div><strong className="text-[#242424]">Root Cause:</strong> <span className="text-[#6B6B6B]">{pm.root_cause}</span></div>
              <div><strong className="text-[#242424]">Successful Action:</strong> <span className="text-[#166534] font-semibold">{pm.successful_action}</span></div>
              <div className="col-span-full"><strong className="text-[#242424]">Lessons Learned:</strong> <span className="text-[#6B6B6B]">{pm.lessons_learned}</span></div>
            </div>

            {incident.retained_memory && (
              <div className="p-3 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534] text-xs">
                ✓ Retained Memory ID: <strong>{incident.retained_memory.id}</strong> — Ready for automatic retrieval in subsequent incidents!
              </div>
            )}
          </div>
        </div>
      )}

      {/* 35. INCIDENT AI CHAT ASSISTANT (Spec 35) */}
      <IncidentAIChat incidentId={incidentId} />

    </div>
  );
}
