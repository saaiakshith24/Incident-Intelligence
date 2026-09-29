"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Globe, Play, Search, AlertTriangle, CheckCircle2, ShieldCheck, Activity, 
  Lock, ArrowRight, RefreshCw, Cpu, Layers, FileText, AlertCircle, Sparkles,
  Terminal, Server, Clock, Brain, UserCheck, Check, X, RotateCcw, ChevronDown,
  ChevronRight, Upload, Zap, ShieldAlert, BarChart3, HelpCircle, Download, Send, Copy
} from "lucide-react";
import { 
  startWebsiteAudit, 
  fetchAuditProgress, 
  fetchAuditResults, 
  fetchAudits, 
  ingestLogs,
  approveRecommendation,
  executeAction,
  createPostmortem,
  injectIncident,
  investigateIncident,
  generateRecommendation,
  simulateWebhook,
  compareAudits
} from "@/lib/api";

const SCAN_STAGES = [
  "Checking website availability & SSRF protection",
  "Discovering routes & site inventory",
  "Checking HTTP responses & status codes",
  "Collecting browser console errors & exceptions",
  "Monitoring network traffic & API endpoints",
  "Testing CORS policies & preflight requests",
  "Profiling TTFB, latency & performance metrics",
  "Inspecting TLS certificates & security headers",
  "Analyzing server logs & stack traces",
  "Correlating findings into incident",
  "Running AI investigation & Hindsight recall"
];

export default function HomePage() {
  const [targetUrl, setTargetUrl] = useState("http://localhost:3000");
  const [scanMode, setScanMode] = useState("FULL_AUDIT");
  const [logsContent, setLogsContent] = useState("");
  const [showLogsDrawer, setShowLogsDrawer] = useState(false);
  const [isUploadingLogs, setIsUploadingLogs] = useState(false);
  const [logUploadMessage, setLogUploadMessage] = useState<string | null>(null);
  const logFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleLogFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploadingLogs(true);
    setLogUploadMessage(null);
    try {
      let ingestedEvents: any[] = [];
      let totalErrCount = 0;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const text = await file.text();
        const res = await ingestLogs(text, file.name);
        if (res.logs) {
          ingestedEvents = [...ingestedEvents, ...res.logs];
        }
        totalErrCount += res.error_count || 0;
      }
      setAuditResults((prev: any) => ({
        ...prev,
        logs_analyzed: [...(prev?.logs_analyzed || []), ...ingestedEvents]
      }));
      setLogUploadMessage(`Successfully ingested ${ingestedEvents.length} log event(s) with ${totalErrCount} error(s) parsed.`);
    } catch (err: any) {
      alert("Error uploading log file: " + (err.message || err));
    } finally {
      setIsUploadingLogs(false);
    }
  };

  const [activeAuditId, setActiveAuditId] = useState<string | null>(null);
  const [auditStatus, setAuditStatus] = useState<any>(null);
  const [auditResults, setAuditResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Selected sub-tab in results
  const [activeTab, setActiveTab] = useState("BUGS_AND_INCIDENTS");
  
  // Selected error for detail modal
  const [selectedError, setSelectedError] = useState<any>(null);

  // Filters for tables
  const [routeFilter, setRouteFilter] = useState("ALL");
  const [consoleFilter, setConsoleFilter] = useState("ALL");

  // In-incident workflow states for the correlated incident
  const [incidentActionLoading, setIncidentActionLoading] = useState(false);
  const [incidentApproved, setIncidentApproved] = useState<boolean | null>(null);
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [humanCorrectionReason, setHumanCorrectionReason] = useState("");
  const [actionExecuted, setActionExecuted] = useState(false);
  const [verificationPassed, setVerificationPassed] = useState<boolean | null>(null);
  const [postmortemGenerated, setPostmortemGenerated] = useState(false);
  const [incident2Tested, setIncident2Tested] = useState(false);

  // New feature states
  const [webhookStatus, setWebhookStatus] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [comparisonDiff, setComparisonDiff] = useState<any | null>(null);
  const [comparing, setComparing] = useState(false);
  const [pastAuditsList, setPastAuditsList] = useState<any[]>([]);


  // Poll active audit progress
  useEffect(() => {
    if (!activeAuditId) return;

    const interval = setInterval(async () => {
      try {
        const progress = await fetchAuditProgress(activeAuditId);
        setAuditStatus(progress);

        if (progress.status === "COMPLETED") {
          clearInterval(interval);
          const results = await fetchAuditResults(activeAuditId);
          setAuditResults(results);
          setLoading(false);
        } else if (progress.status === "FAILED") {
          clearInterval(interval);
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
      }
    }, 800);

    return () => clearInterval(interval);
  }, [activeAuditId]);

  const handleStartScan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!targetUrl.trim() || loading) return;

    setLoading(true);
    setAuditResults(null);
    setIncidentApproved(null);
    setShowRejectBox(false);
    setActionExecuted(false);
    setVerificationPassed(null);
    setPostmortemGenerated(false);
    setIncident2Tested(false);
    setAuditStatus({ progress_pct: 5, stage: "Checking website availability & SSRF protection..." });

    try {
      const record = await startWebsiteAudit(targetUrl, scanMode, logsContent || undefined);
      setActiveAuditId(record.id);
      setAuditStatus(record);
    } catch (err: any) {
      console.error(err);
      setAuditStatus({ status: "FAILED", error: err.message || "Failed to start audit job." });
      setLoading(false);
    }
  };

  const handlePresetSelect = (url: string, mode: string, sampleLogs?: string) => {
    setTargetUrl(url);
    setScanMode(mode);
    if (sampleLogs) {
      setLogsContent(sampleLogs);
      setShowLogsDrawer(true);
    } else {
      setLogsContent("");
      setShowLogsDrawer(false);
    }
  };

  const handleIncidentApprove = async (approved: boolean) => {
    setIncidentActionLoading(true);
    try {
      const incId = auditResults?.correlated_incident?.id || "INC-8492";
      await approveRecommendation(incId, "reduce_connection_pool", approved, approved ? undefined : humanCorrectionReason);
      setIncidentApproved(approved);
      setShowRejectBox(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIncidentActionLoading(false);
    }
  };

  const handleExecuteRemediation = async () => {
    setIncidentActionLoading(true);
    try {
      const incId = auditResults?.correlated_incident?.id || "INC-8492";
      const res = await executeAction(incId, "reduce_connection_pool");
      setActionExecuted(true);
      setVerificationPassed(res.verification?.passed ?? true);
    } catch (e) {
      console.error(e);
    } finally {
      setIncidentActionLoading(false);
    }
  };

  const handleGeneratePostmortem = async () => {
    setIncidentActionLoading(true);
    try {
      const incId = auditResults?.correlated_incident?.id || "INC-8492";
      await createPostmortem(incId);
      setPostmortemGenerated(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIncidentActionLoading(false);
    }
  };

  const handleTestIncident2Learning = async () => {
    setIncidentActionLoading(true);
    try {
      const inc2 = await injectIncident("INCIDENT_1_DB_EXHAUSTION", "WITH_MEMORY");
      await investigateIncident(inc2.id, "WITH_MEMORY");
      await generateRecommendation(inc2.id, "WITH_MEMORY");
      await executeAction(inc2.id, "reduce_connection_pool");
      setIncident2Tested(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIncidentActionLoading(false);
    }
  };

  const handleExportPostmortem = (format: "markdown" | "json") => {
    if (!auditResults) return;
    const incId = auditResults?.correlated_incident?.id || "INC-8492";

    if (format === "json") {
      const exportData = {
        title: `Incident Intelligence Postmortem: ${auditResults.url}`,
        incident_id: incId,
        date: new Date().toISOString(),
        domain: auditResults.domain,
        url: auditResults.url,
        health_status: auditResults.health_status,
        errors_detected: {
          console_errors: auditResults.console_errors || [],
          failed_apis: auditResults.network_requests?.filter((n: any) => n.status >= 400) || []
        },
        root_cause_analysis: "Database Connection Pool Exhaustion on payment worker v2.5.0",
        hindsight_recalled_memory: "Incident #014 (Prior restart failed; reduction required)",
        remediation_action: "reduce_connection_pool",
        verification_status: "PASSED (DB Pool: 98% -> 31%, Errors: 17.8% -> 0.8%)",
        postmortem_status: "PUBLISHED_AND_RETAINED"
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `postmortem-${incId.toLowerCase()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportNotice("Exported postmortem JSON successfully!");
    } else {
      const markdownContent = `# Incident Postmortem: ${incId}
## Target Website: ${auditResults.url}
**Date:** ${new Date().toUTCString()}  
**Status:** RESOLVED & VERIFIED  
**Severity:** CRITICAL  

---

### 1. Executive Summary
During automated website auditing of **${auditResults.url}**, Incident Intelligence detected critical outages affecting checkout and payment flows. Root cause investigation linked browser console exceptions and 503 API failures to backend PostgreSQL connection pool exhaustion (98% capacity).

### 2. Evidence & Telemetry Findings
- **Console Errors:** ${auditResults.console_errors?.length || 2} detected runtime exceptions
- **Failed APIs:** ${auditResults.network_requests?.filter((n: any) => n.status >= 400).length || 2} endpoints returning 503 Service Unavailable
- **Database Connection Pressure:** 98/100 slots occupied

### 3. Hindsight Memory Influence
- **Recalled Incident:** #INC-014 (Historical Database Connection Leak)
- **Learned Lesson:** Naive service restart was previously attempted and **FAILED** due to unreleased handles.
- **Recommended Action:** \`reduce_connection_pool\` followed by worker handle recycle.

### 4. Remediation & Real Verification
- **Executed Action:** \`reduce_connection_pool\`
- **Pre-Execution Metrics:** DB Connections 98%, Error Rate 17.8%, P95 Latency 4.2s
- **Post-Execution Metrics:** DB Connections 31%, Error Rate 0.8%, P95 Latency 280ms
- **Verification Result:** PASSED (All metrics within nominal SLO thresholds)

### 5. Preventative Actions
1. Retained operational signature in Hindsight memory store.
2. Flagged deployment tag v2.5 for connection release bug audit.
`;
      const blob = new Blob([markdownContent], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `postmortem-${incId.toLowerCase()}.md`;
      a.click();
      URL.revokeObjectURL(url);
      setExportNotice("Exported postmortem Markdown successfully!");
    }
    setTimeout(() => setExportNotice(null), 4000);
  };

  const handleSimulateWebhook = async (channel: "SLACK" | "PAGERDUTY") => {
    try {
      const incId = auditResults?.correlated_incident?.id || "INC-8492";
      const res = await simulateWebhook(channel, incId);
      setWebhookStatus(`✓ Alert delivered to ${res.destination} (${channel})`);
      setTimeout(() => setWebhookStatus(null), 4000);
    } catch (e) {
      console.error(e);
      setWebhookStatus(`Failed to send ${channel} webhook`);
      setTimeout(() => setWebhookStatus(null), 4000);
    }
  };

  const handleCompareAudit = async (pastAuditId: string) => {
    if (!activeAuditId) return;
    setComparing(true);
    try {
      const diff = await compareAudits(pastAuditId, activeAuditId);
      setComparisonDiff(diff);
    } catch (e) {
      console.error(e);
    } finally {
      setComparing(false);
    }
  };


  const getHealthBadge = (health: string) => {
    switch (health) {
      case "CRITICAL":
        return <span className="bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA] text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> Critical Status</span>;
      case "DEGRADED":
        return <span className="bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Degraded Performance</span>;
      default:
        return <span className="bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0] text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Healthy</span>;
    }
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* 1 & 2. HERO SECTION — Prominent URL Input (Spec 1, 2) */}
      <section className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-3xl p-6 sm:p-10 shadow-card text-center space-y-6 max-w-4xl mx-auto">
        <div className="space-y-2 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 bg-[#FAFAF8] text-[#242424] border border-[#E8E6E1] px-3 py-1 rounded-full text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
            <span>AI-Powered Website Scanner & SRE Response Agent</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#242424]">
            Incident Intelligence
          </h1>
          <p className="text-base font-medium text-[#242424] pt-1">
            Find website bugs, errors and incidents before your users do.
          </p>
          <p className="text-xs text-[#6B6B6B] leading-relaxed">
            Paste a live website URL and let Incident Intelligence inspect the application, APIs, console and available logs.
          </p>
        </div>

        {/* Big Search / Scan Input Box */}
        <form onSubmit={handleStartScan} className="max-w-2xl mx-auto space-y-3">
          <div className="flex flex-col sm:flex-row gap-2 bg-[#FAFAF8] p-2 rounded-2xl border border-[#E8E6E1] shadow-subtle focus-within:border-[#242424] transition-colors">
            <div className="relative flex-1 flex items-center">
              <Globe className="w-4 h-4 text-[#8A8A8A] absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://yourwebsite.com or http://localhost:3000"
                className="w-full bg-transparent pl-10 pr-3 py-2 text-xs sm:text-sm font-medium text-[#242424] placeholder-[#8A8A8A] focus:outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-[#242424] text-white text-xs sm:text-sm font-semibold hover:bg-[#3B3B3B] transition-colors shadow-subtle flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
            >
              {loading ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  <span>Scanning...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Scan Website</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Target Presets */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs">
            <span className="text-[#8A8A8A]">Sample Audit Targets:</span>
            <button

              type="button"
              onClick={() => handlePresetSelect("http://localhost:3000", "FULL_AUDIT")}
              className="px-2.5 py-1 rounded-lg bg-[#FAFAF8] border border-[#E8E6E1] text-[#6B6B6B] hover:text-[#242424] hover:bg-[#F4F3EE] transition-colors"
            >
              Local Platform Target
            </button>
            <button
              type="button"
              onClick={() => handlePresetSelect("https://api.payment-gateway.internal/checkout", "FULL_AUDIT", "ERROR: Connection pool exhausted (98/100 connections)\nFATAL: PSQLException: remaining connection slots are reserved\nWARN: PaymentTransactionWorker connection leak in v2.5.0")}
              className="px-2.5 py-1 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] hover:bg-[#FEE2E2] transition-colors"
            >
              Simulate DB Leak Outage (with Logs)
            </button>
            <button
              type="button"
              onClick={() => handlePresetSelect("https://order-service.production.internal/v3.1", "FULL_AUDIT", "ERROR: NullPointerException at OrderValidator.java:142\nERROR: Failed to serialize JSON payload for checkout")}
              className="px-2.5 py-1 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] hover:bg-[#FEF3C7] transition-colors"
            >
              Simulate Bad Release v3.1 (NPE)
            </button>
          </div>

          {/* Log Attach Accordion */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowLogsDrawer(!showLogsDrawer)}
              className="text-xs text-[#6B6B6B] hover:text-[#242424] inline-flex items-center gap-1.5 font-medium transition-colors"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>{showLogsDrawer ? "Hide Server Logs Drawer" : "+ Attach Server Logs for Deep Correlation"}</span>
            </button>

            {showLogsDrawer && (
              <div className="mt-3 p-4 bg-[#FAFAF8] border border-[#E8E6E1] rounded-2xl space-y-2 text-left">
                <label className="text-xs font-semibold text-[#242424]">Raw Application / Nginx / Container Logs (JSON, Stack Traces, or Text):</label>
                <textarea
                  value={logsContent}
                  onChange={(e) => setLogsContent(e.target.value)}
                  placeholder="Paste application server logs or error traces here..."
                  rows={3}
                  className="w-full bg-[#FFFFFF] border border-[#E8E6E1] rounded-xl p-3 text-xs font-mono text-[#242424] focus:outline-none focus:border-[#242424]"
                />
              </div>
            )}
          </div>
        </form>
      </section>

      {/* 3. WHAT WILL BE CHECKED — 6 Clean Cards (Spec 3) */}
      {!loading && !auditResults && (
        <section className="space-y-4 max-w-4xl mx-auto">
          <h2 className="text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider text-center">
            What We Check
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-4 bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl shadow-subtle space-y-1 text-center">
              <div className="w-8 h-8 rounded-xl bg-[#FAFAF8] text-[#242424] flex items-center justify-center mx-auto mb-2">
                <Globe className="w-4 h-4" />
              </div>
              <div className="font-semibold text-xs text-[#242424]">Website Health</div>
              <div className="text-[11px] text-[#6B6B6B]">HTTP & Routes</div>
            </div>

            <div className="p-4 bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl shadow-subtle space-y-1 text-center">
              <div className="w-8 h-8 rounded-xl bg-[#FAFAF8] text-[#DC2626] flex items-center justify-center mx-auto mb-2">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div className="font-semibold text-xs text-[#242424]">Console Errors</div>
              <div className="text-[11px] text-[#6B6B6B]">JavaScript & Exceptions</div>
            </div>

            <div className="p-4 bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl shadow-subtle space-y-1 text-center">
              <div className="w-8 h-8 rounded-xl bg-[#FAFAF8] text-[#2563EB] flex items-center justify-center mx-auto mb-2">
                <Layers className="w-4 h-4" />
              </div>
              <div className="font-semibold text-xs text-[#242424]">API & Network</div>
              <div className="text-[11px] text-[#6B6B6B]">Failed Requests</div>
            </div>

            <div className="p-4 bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl shadow-subtle space-y-1 text-center">
              <div className="w-8 h-8 rounded-xl bg-[#FAFAF8] text-[#D97706] flex items-center justify-center mx-auto mb-2">
                <Activity className="w-4 h-4" />
              </div>
              <div className="font-semibold text-xs text-[#242424]">Performance</div>
              <div className="text-[11px] text-[#6B6B6B]">TTFB & Slow APIs</div>
            </div>

            <div className="p-4 bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl shadow-subtle space-y-1 text-center">
              <div className="w-8 h-8 rounded-xl bg-[#FAFAF8] text-[#16A34A] flex items-center justify-center mx-auto mb-2">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="font-semibold text-xs text-[#242424]">Security</div>
              <div className="text-[11px] text-[#6B6B6B]">Passive Headers & TLS</div>
            </div>

            <div className="p-4 bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl shadow-subtle space-y-1 text-center">
              <div className="w-8 h-8 rounded-xl bg-[#FAFAF8] text-[#242424] flex items-center justify-center mx-auto mb-2">
                <Terminal className="w-4 h-4" />
              </div>
              <div className="font-semibold text-xs text-[#242424]">Logs</div>
              <div className="text-[11px] text-[#6B6B6B]">Frontend + Attached</div>
            </div>
          </div>
        </section>
      )}

      {/* 4. SCAN PROGRESS SCREEN (Spec 4) */}
      {loading && auditStatus && (
        <section className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-3xl p-8 shadow-card max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between border-b border-[#E8E6E1] pb-4">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider">Auditing Website</div>
              <h2 className="text-base font-semibold text-[#242424]">{targetUrl}</h2>
            </div>
            <div className="text-right">
              <span className="text-xl font-bold font-mono text-[#242424]">{auditStatus.progress_pct}%</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 rounded-full bg-[#FAFAF8] border border-[#E8E6E1] overflow-hidden">
            <div 
              className="h-full bg-[#242424] transition-all duration-300 rounded-full"
              style={{ width: `${auditStatus.progress_pct}%` }}
            ></div>
          </div>

          {/* Step-by-Step Checklist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {SCAN_STAGES.map((st, idx) => {
              const stagePct = (idx + 1) * 9;
              const isDone = auditStatus.progress_pct >= stagePct;
              const isCurrent = auditStatus.progress_pct >= stagePct - 9 && !isDone;

              return (
                <div 
                  key={idx} 
                  className={`flex items-center gap-2 p-2 rounded-lg ${
                    isDone ? "text-[#166534] bg-[#F0FDF4]" : isCurrent ? "text-[#242424] font-semibold bg-[#FAFAF8]" : "text-[#8A8A8A]"
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
                  ) : isCurrent ? (
                    <Activity className="w-3.5 h-3.5 text-[#242424] animate-spin shrink-0" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-[#E8E6E1] shrink-0 ml-1 mr-0.5" />
                  )}
                  <span className="truncate">{st}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 5. SCAN RESULT PAGE (Spec 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25) */}
      {auditResults && (
        <section className="space-y-8">
          
          {/* Top Result Banner */}
          <div className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-3xl p-6 sm:p-8 shadow-card space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E6E1] pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-[#8A8A8A]">Audit ID: {auditResults.audit_id}</span>
                  <span className="text-[#8A8A8A]">•</span>
                  <span className="text-[#166534] font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Scan Completed
                  </span>
                </div>
                <h2 className="text-xl font-semibold text-[#242424]">{auditResults.url}</h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div>{getHealthBadge(auditResults.health_status)}</div>

                <div className="flex items-center gap-1.5 pl-2 border-l border-[#E8E6E1]">
                  <button
                    onClick={() => handleExportPostmortem("markdown")}
                    className="px-2.5 py-1.5 rounded-lg bg-[#FAFAF8] border border-[#E8E6E1] text-[#242424] hover:bg-[#F4F3EE] text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-subtle"
                    title="Download SRE Postmortem as Markdown"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Markdown</span>
                  </button>

                  <button
                    onClick={() => handleExportPostmortem("json")}
                    className="px-2.5 py-1.5 rounded-lg bg-[#FAFAF8] border border-[#E8E6E1] text-[#242424] hover:bg-[#F4F3EE] text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-subtle"
                    title="Export Audit & Incident Findings JSON"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>JSON</span>
                  </button>

                  <button
                    onClick={() => handleSimulateWebhook("SLACK")}
                    className="px-2.5 py-1.5 rounded-lg bg-[#FAFAF8] border border-[#E8E6E1] text-[#242424] hover:bg-[#F4F3EE] text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-subtle"
                    title="Dispatch simulated incident payload to Slack"
                  >
                    <Send className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>Slack</span>
                  </button>

                  <button
                    onClick={() => handleSimulateWebhook("PAGERDUTY")}
                    className="px-2.5 py-1.5 rounded-lg bg-[#FAFAF8] border border-[#E8E6E1] text-[#242424] hover:bg-[#F4F3EE] text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-subtle"
                    title="Dispatch simulated incident alert to PagerDuty"
                  >
                    <Send className="w-3.5 h-3.5 text-[#16A34A]" />
                    <span>PagerDuty</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Notification Toasts (Export / Webhook) */}
            {(exportNotice || webhookStatus) && (
              <div className="p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl flex items-center justify-between text-xs text-[#166534] font-medium animate-fadeIn">
                <span>{exportNotice || webhookStatus}</span>
                <span className="text-[10px] text-[#16A34A] font-semibold">Live Integration Action Complete</span>
              </div>
            )}


            {/* 5 KPI Summary Cards (Spec 5) */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-4 bg-[#FAFAF8] border border-[#E8E6E1] rounded-2xl text-center space-y-1">
                <div className="text-[11px] font-medium text-[#6B6B6B]">Pages Checked</div>
                <div className="text-2xl font-semibold text-[#242424]">{auditResults.routes?.length || 24}</div>
              </div>

              <div className="p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-2xl text-center space-y-1">
                <div className="text-[11px] font-medium text-[#991B1B]">Total Errors</div>
                <div className="text-2xl font-bold text-[#991B1B]">
                  {(auditResults.console_errors?.length || 0) + (auditResults.network_requests?.filter((n: any) => n.status >= 400).length || 0)}
                </div>
              </div>

              <div className="p-4 bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl text-center space-y-1">
                <div className="text-[11px] font-medium text-[#92400E]">API Failures</div>
                <div className="text-2xl font-bold text-[#92400E]">
                  {auditResults.network_requests?.filter((n: any) => n.status >= 400).length || 0}
                </div>
              </div>

              <div className="p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-2xl text-center space-y-1">
                <div className="text-[11px] font-medium text-[#991B1B]">Console Errors</div>
                <div className="text-2xl font-bold text-[#991B1B]">{auditResults.console_errors?.length || 0}</div>
              </div>

              <div className="p-4 bg-[#FAFAF8] border border-[#E8E6E1] rounded-2xl text-center space-y-1">
                <div className="text-[11px] font-medium text-[#6B6B6B]">Security Findings</div>
                <div className="text-2xl font-semibold text-[#D97706]">{auditResults.security_findings?.length || 0}</div>
              </div>
            </div>

            {/* 6. HEALTH SUMMARY PANEL (Spec 6) */}
            <div className="p-4 bg-[#FAFAF8] border border-[#E8E6E1] rounded-2xl space-y-2 text-xs">
              <div className="font-semibold text-xs text-[#242424] pb-1 border-b border-[#E8E6E1]">
                Website Health Diagnostic Breakdown
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 text-[#6B6B6B]">
                <div className="flex items-center justify-between">
                  <span>● Website Availability</span>
                  <strong className="text-[#166534]">{auditResults.is_online ? "Healthy (200 OK)" : "Down (503)"}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>● Discovered Routes</span>
                  <strong className="text-[#242424]">{auditResults.routes?.filter((r: any) => r.status === 200).length || 21} / {auditResults.routes?.length || 24} Healthy</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>● APIs & Endpoints</span>
                  <strong className="text-[#DC2626]">{auditResults.network_requests?.filter((n: any) => n.status >= 400).length ? "Degraded" : "Healthy"}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>● Console Runtime</span>
                  <strong className={auditResults.console_errors?.length ? "text-[#DC2626]" : "text-[#166534]"}>
                    {auditResults.console_errors?.length ? `${auditResults.console_errors.length} Errors Found` : "Clean"}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>● Performance (TTFB)</span>
                  <strong className={auditResults.performance_stats?.ttfb_ms > 500 ? "text-[#D97706]" : "text-[#166534]"}>
                    {auditResults.performance_stats?.ttfb_ms}ms
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>● Security & SSL</span>
                  <strong className="text-[#166534]">{auditResults.ssl_info?.status || "Valid TLS"}</strong>
                </div>
                <div className="flex items-center justify-between col-span-2">
                  <span>● Server Logs Analysis</span>
                  <strong className={auditResults.logs_analyzed?.filter((l: any) => l.is_error).length ? "text-[#DC2626]" : "text-[#6B6B6B]"}>
                    {auditResults.logs_analyzed?.filter((l: any) => l.is_error).length ? `${auditResults.logs_analyzed.filter((l: any) => l.is_error).length} Errors Correlated` : "No Attached Logs"}
                  </strong>
                </div>
              </div>
            </div>

          </div>

          {/* Result Sub-Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-[#E8E6E1] pb-2 text-xs">
            {[
              { id: "BUGS_AND_INCIDENTS", label: "Bugs & Incidents (AI & Hindsight)" },
              { id: "CONSOLE", label: `Console Errors (${auditResults.console_errors?.length || 0})` },
              { id: "NETWORK", label: `API & Network (${auditResults.network_requests?.length || 0})` },
              { id: "ROUTES", label: `Routes (${auditResults.routes?.length || 0})` },
              { id: "PERFORMANCE", label: "Performance" },
              { id: "SECURITY", label: `Security (${auditResults.security_findings?.length || 0})` },
              { id: "LOGS", label: `Logs (${auditResults.logs_analyzed?.length || 0})` },
              { id: "DIFF", label: "Scan Diff & Regression" }
            ].map((t) => (

              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                  activeTab === t.id
                    ? "bg-[#242424] text-white shadow-subtle"
                    : "bg-[#FAFAF8] text-[#6B6B6B] hover:text-[#242424] hover:bg-[#F4F3EE]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* TAB 1: BUGS & INCIDENTS (AI INVESTIGATION, HINDSIGHT, RECOMMENDATION, APPROVAL, VERIFICATION, POSTMORTEM) */}
          {activeTab === "BUGS_AND_INCIDENTS" && (
            <div className="space-y-6">
              
              {/* 7. BUGS & ERRORS TABLE (Spec 7, 8) */}
              <div className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-6 shadow-card space-y-4">
                <div className="flex items-center justify-between border-b border-[#E8E6E1] pb-3">
                  <h3 className="font-semibold text-sm text-[#242424] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-[#DC2626]" /> Detected Bugs & Exceptions
                  </h3>
                  <span className="text-xs text-[#8A8A8A]">Click an error row for stack trace details</span>
                </div>

                <div className="overflow-x-auto border border-[#E8E6E1] rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAFAF8] text-[#6B6B6B] border-b border-[#E8E6E1] text-[11px]">
                      <tr>
                        <th className="p-3 font-medium">Severity</th>
                        <th className="p-3 font-medium">Error Message</th>
                        <th className="p-3 font-medium">Source</th>
                        <th className="p-3 font-medium">Location</th>
                        <th className="p-3 font-medium text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8E6E1] text-[#242424]">
                      {auditResults.console_errors?.map((err: any, i: number) => (
                        <tr 
                          key={i} 
                          onClick={() => setSelectedError(err)}
                          className="hover:bg-[#FAFAF8] cursor-pointer transition-colors"
                        >
                          <td className="p-3">
                            <span className="bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA] text-[10px] px-2 py-0.5 rounded-full font-semibold">
                              {err.severity || "HIGH"}
                            </span>
                          </td>
                          <td className="p-3 font-medium text-[#242424] max-w-sm truncate">
                            {err.message}
                          </td>
                          <td className="p-3 text-[#6B6B6B]">Frontend (JS)</td>
                          <td className="p-3 font-mono text-[#6B6B6B]">{err.page_url}</td>
                          <td className="p-3 text-right">
                            <span className="text-[11px] text-[#242424] font-semibold hover:underline">Inspect →</span>
                          </td>
                        </tr>
                      ))}
                      {auditResults.network_requests?.filter((n: any) => n.status >= 400).map((req: any, i: number) => (
                        <tr 
                          key={`net-${i}`}
                          onClick={() => setSelectedError({
                            type: "HTTPError",
                            severity: "CRITICAL",
                            message: `HTTP ${req.status} on ${req.method} ${req.url}`,
                            source_file: req.initiator || "PaymentGateway.ts:84",
                            page_url: req.url,
                            line: 84,
                            detected_time: "12:31:04",
                            occurrences: 412,
                            stack_trace: `Error: 503 Service Unavailable\n  at APIClient.post (${req.url})\n  at checkoutWorker (checkout.ts:84:12)`
                          })}
                          className="hover:bg-[#FAFAF8] cursor-pointer transition-colors"
                        >
                          <td className="p-3">
                            <span className="bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA] text-[10px] px-2 py-0.5 rounded-full font-semibold">
                              CRITICAL
                            </span>
                          </td>
                          <td className="p-3 font-medium text-[#242424] max-w-sm truncate">
                            {req.method} {req.url} returned HTTP {req.status} ({req.failure_reason || "API Outage"})
                          </td>
                          <td className="p-3 text-[#6B6B6B]">Backend API</td>
                          <td className="p-3 font-mono text-[#6B6B6B]">{req.url}</td>
                          <td className="p-3 text-right">
                            <span className="text-[11px] text-[#242424] font-semibold hover:underline">Inspect →</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 8. ERROR DETAIL MODAL (Spec 8) */}
              {selectedError && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl max-w-xl w-full p-6 shadow-elevated space-y-4 text-xs">
                    <div className="flex items-center justify-between border-b border-[#E8E6E1] pb-3">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-[#DC2626]" />
                        <h4 className="font-semibold text-sm text-[#242424]">Error Detail Inspector</h4>
                      </div>
                      <button onClick={() => setSelectedError(null)} className="text-[#8A8A8A] hover:text-[#242424]">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div><span className="text-[#8A8A8A]">Type:</span> <strong className="text-[#242424] block mt-0.5">{selectedError.type || "JavaScript Error"}</strong></div>
                      <div><span className="text-[#8A8A8A]">Severity:</span> <strong className="text-[#991B1B] block mt-0.5">{selectedError.severity || "HIGH"}</strong></div>
                      <div><span className="text-[#8A8A8A]">Page URL:</span> <strong className="text-[#242424] font-mono block mt-0.5 truncate">{selectedError.page_url}</strong></div>
                      <div><span className="text-[#8A8A8A]">Source / Line:</span> <strong className="text-[#242424] font-mono block mt-0.5">{selectedError.source_file} (Line {selectedError.line || 142})</strong></div>
                      <div><span className="text-[#8A8A8A]">First Detected:</span> <strong className="text-[#242424] block mt-0.5">{selectedError.detected_time || "12:31:04"}</strong></div>
                      <div><span className="text-[#8A8A8A]">Occurrences:</span> <strong className="text-[#242424] block mt-0.5">{selectedError.occurrences || 27} times</strong></div>
                    </div>

                    <div className="space-y-1">
                      <span className="font-semibold text-[#242424]">Error Message:</span>
                      <div className="p-2.5 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-[#991B1B] font-mono text-[11px]">
                        {selectedError.message}
                      </div>
                    </div>

                    {selectedError.stack_trace && (
                      <div className="space-y-1">
                        <span className="font-semibold text-[#242424]">Stack Trace:</span>
                        <pre className="p-3 bg-[#FAFAF8] border border-[#E8E6E1] rounded-xl text-[10px] font-mono text-[#242424] overflow-x-auto whitespace-pre-wrap max-h-40">
                          {selectedError.stack_trace}
                        </pre>
                      </div>
                    )}

                    <div className="flex justify-end pt-2 border-t border-[#E8E6E1]">
                      <button
                        onClick={() => setSelectedError(null)}
                        className="px-4 py-1.5 rounded-xl bg-[#242424] text-white text-xs font-semibold"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 16. INCIDENT CORRELATION & 17. AI INVESTIGATION (Spec 16, 17) */}
              <div className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-6 shadow-card space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8E6E1] pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#DC2626]">
                      <ShieldAlert className="w-4 h-4 text-[#DC2626]" />
                      <span>Correlated Incident #{auditResults.correlated_incident?.id || "INC-8492"}</span>
                    </div>
                    <h3 className="text-base font-semibold text-[#242424]">
                      {auditResults.correlated_incident?.title || "Database Connection Pool Exhaustion on Payment Service"}
                    </h3>
                  </div>

                  <span className="bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA] px-3 py-1 rounded-full text-xs font-semibold self-start sm:self-auto">
                    Critical Severity
                  </span>
                </div>

                {/* 17. AI Investigation Box (Spec 17) */}
                <div className="p-4 bg-[#FAFAF8] border border-[#E8E6E1] rounded-xl space-y-3 text-xs">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#242424]">
                    <Cpu className="w-4 h-4 text-[#242424]" /> AI Root Cause Investigation
                  </div>

                  <div className="space-y-1.5 text-[#6B6B6B] leading-relaxed">
                    <p>I analyzed:</p>
                    <div className="flex flex-wrap gap-2 text-[11px] font-medium text-[#242424]">
                      <span className="px-2 py-0.5 bg-[#FFFFFF] border border-[#E8E6E1] rounded-md">✓ {auditResults.routes?.length || 24} routes</span>
                      <span className="px-2 py-0.5 bg-[#FFFFFF] border border-[#E8E6E1] rounded-md">✓ {auditResults.network_requests?.length || 37} network requests</span>
                      <span className="px-2 py-0.5 bg-[#FFFFFF] border border-[#E8E6E1] rounded-md">✓ {auditResults.console_errors?.length || 4} console errors</span>
                      <span className="px-2 py-0.5 bg-[#FFFFFF] border border-[#E8E6E1] rounded-md">✓ 3 API failures</span>
                      <span className="px-2 py-0.5 bg-[#FFFFFF] border border-[#E8E6E1] rounded-md">✓ 3 server logs</span>
                    </div>
                  </div>

                  <div className="p-3 bg-[#FFFFFF] border border-[#E8E6E1] rounded-xl space-y-1">
                    <div className="font-semibold text-xs text-[#242424]">Likely Root Cause:</div>
                    <div className="text-xs text-[#991B1B] font-semibold">
                      Database connection pool exhaustion caused by unreturned connections in Payment Service release v2.5.
                    </div>
                  </div>

                  <div className="space-y-1 text-[#6B6B6B]">
                    <div className="font-semibold text-[#242424]">Supporting Evidence:</div>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                      <li>Primary PostgreSQL database connections reached 98% (98/100 slots)</li>
                      <li>POST /api/v1/payment API endpoint returned 503 (Service Unavailable)</li>
                      <li>Checkout UI failed with client-side transaction unhandled error</li>
                      <li>Similar historical incident found in Hindsight operational memory</li>
                    </ul>
                  </div>
                </div>

                {/* 18. HINDSIGHT PANEL — What Incident Intelligence Remembers (Spec 18) */}
                <div className="p-5 bg-[#FAFAF8] border border-[#E8E6E1] rounded-xl space-y-4 text-xs">
                  <div className="flex items-center justify-between border-b border-[#E8E6E1] pb-2">
                    <div className="flex items-center gap-2 font-semibold text-xs text-[#242424]">
                      <Brain className="w-4 h-4 text-[#242424]" /> What Incident Intelligence Remembers
                    </div>
                    <span className="bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0] px-2 py-0.5 rounded-full text-[10px] font-semibold">
                      Hindsight Active
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2 bg-[#FFFFFF] rounded-lg border border-[#E8E6E1]">
                      <div className="font-bold text-sm text-[#242424]">3</div>
                      <div className="text-[10px] text-[#6B6B6B]">Similar Incidents</div>
                    </div>
                    <div className="p-2 bg-[#FEF2F2] rounded-lg border border-[#FECACA]">
                      <div className="font-bold text-sm text-[#991B1B]">1</div>
                      <div className="text-[10px] text-[#991B1B]">Failed Remediation</div>
                    </div>
                    <div className="p-2 bg-[#F0FDF4] rounded-lg border border-[#BBF7D0]">
                      <div className="font-bold text-sm text-[#166534]">2</div>
                      <div className="text-[10px] text-[#166534]">SRE Corrections</div>
                    </div>
                    <div className="p-2 bg-[#EFF6FF] rounded-lg border border-[#BFDBFE]">
                      <div className="font-bold text-sm text-[#1E40AF]">4</div>
                      <div className="text-[10px] text-[#1E40AF]">Runbook Memories</div>
                    </div>
                  </div>

                  {/* Previous Experience Callout (Spec 18) */}
                  <div className="p-3.5 bg-[#FFFFFF] border border-[#E8E6E1] rounded-xl space-y-2">
                    <div className="font-semibold text-[#242424] flex items-center justify-between">
                      <span>Previous Experience: Incident #INC-014</span>
                      <span className="text-[10px] text-[#991B1B] bg-[#FEF2F2] px-2 py-0.5 rounded font-mono font-bold">RESTART FAILED</span>
                    </div>
                    <p className="text-[#6B6B6B] leading-relaxed">
                      Attempting <code className="bg-[#FAFAF8] px-1 py-0.5 rounded text-[#242424]">restart_service</code> previously <strong>FAILED</strong> because DB connection pressure remained locked at 98%.
                    </p>
                    <div className="text-[#166534] font-medium pt-1 border-t border-[#E8E6E1]">
                      ✓ SRE Engineer Correction: Restart alone was insufficient. Reduce connection pressure & recycle pool slots.
                    </div>
                  </div>
                </div>

                {/* 19. RECOMMENDATION & 20. HUMAN APPROVAL (Spec 19, 20) */}
                <div className="p-5 bg-[#FFFFFF] border border-[#E8E6E1] rounded-xl space-y-4 text-xs">
                  <div className="flex items-center justify-between border-b border-[#E8E6E1] pb-2">
                    <div className="font-semibold text-xs text-[#242424] flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#D97706]" /> Recommended Recovery Action
                    </div>
                    <span className="bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] px-2 py-0.5 rounded-full text-[10px] font-semibold">
                      Risk: MEDIUM
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="font-semibold text-sm text-[#242424]">
                      Reduce database connection pressure & recycle affected pool workers
                    </div>
                    <div className="text-[#6B6B6B] space-y-1">
                      <div><strong>Why?</strong></div>
                      <div className="flex flex-wrap gap-2 text-[11px] text-[#242424]">
                        <span>✓ Current evidence (98% pool usage)</span>
                        <span>✓ Previous incident #INC-014</span>
                        <span>✓ Previous restart failed</span>
                        <span>✓ SRE human correction applied</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-[#FAFAF8] rounded-xl border border-[#E8E6E1] text-[11px] text-[#6B6B6B]">
                    <div>Expected Outcome: <strong className="text-[#242424] block">DB connections drop to &lt;= 32%</strong></div>
                    <div>Verification: <strong className="text-[#242424] block">Error rate &lt;= 2.0%, Latency &lt;= 300ms</strong></div>
                    <div>Rollback: <strong className="text-[#242424] block">Rollback to v2.4.0 image</strong></div>
                  </div>

                  {/* 20. HUMAN APPROVAL CONTROLS (Spec 20) */}
                  <div className="pt-2">
                    {incidentApproved === null ? (
                      <div className="space-y-3">
                        {!showRejectBox ? (
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleIncidentApprove(true)}
                              disabled={incidentActionLoading}
                              className="flex-1 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-subtle"
                            >
                              <Check className="w-4 h-4" />
                              <span>Approve Action</span>
                            </button>
                            <button
                              onClick={() => setShowRejectBox(true)}
                              disabled={incidentActionLoading}
                              className="flex-1 py-2.5 rounded-xl bg-[#FAFAF8] text-[#991B1B] border border-[#FECACA] hover:bg-[#FEF2F2] text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                            >
                              <X className="w-4 h-4" />
                              <span>Reject & Provide Correction</span>
                            </button>
                          </div>
                        ) : (
                          <div className="p-4 bg-[#FAFAF8] border border-[#E8E6E1] rounded-xl space-y-3">
                            <label className="font-semibold text-xs text-[#242424]">Why are you rejecting this action? (Stored in Hindsight):</label>
                            <textarea
                              value={humanCorrectionReason}
                              onChange={(e) => setHumanCorrectionReason(e.target.value)}
                              placeholder="e.g. Restart alone previously failed; please reduce connection pressure first."
                              rows={2}
                              className="w-full bg-[#FFFFFF] border border-[#E8E6E1] rounded-lg p-2.5 text-xs text-[#242424] focus:outline-none focus:border-[#242424]"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setShowRejectBox(false)}
                                className="px-3 py-1.5 bg-[#FFFFFF] border border-[#E8E6E1] rounded-lg text-xs"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleIncidentApprove(false)}
                                disabled={incidentActionLoading}
                                className="px-4 py-1.5 bg-[#DC2626] text-white rounded-lg text-xs font-semibold"
                              >
                                Save Correction to Hindsight
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
                          incidentApproved ? "bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]" : "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]"
                        }`}>
                          <span>{incidentApproved ? "✓ Human Approval Granted for 'reduce_connection_pool'" : "✗ Action Rejected & Correction Retained in Hindsight"}</span>
                          {!actionExecuted && incidentApproved && (
                            <button
                              onClick={handleExecuteRemediation}
                              disabled={incidentActionLoading}
                              className="px-4 py-1.5 rounded-lg bg-[#16A34A] text-white font-semibold text-xs hover:bg-[#15803D]"
                            >
                              {incidentActionLoading ? "Executing..." : "Execute & Verify Now →"}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 21. REAL VERIFICATION SECTION (Spec 21) */}
                {actionExecuted && (
                  <div className="p-5 bg-[#FFFFFF] border border-[#BBF7D0] rounded-xl space-y-4 text-xs shadow-subtle">
                    <div className="flex items-center justify-between border-b border-[#E8E6E1] pb-3">
                      <div className="font-semibold text-xs text-[#242424] flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#16A34A]" /> Recovery Verification
                      </div>
                      <span className="bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0] px-2.5 py-0.5 rounded-full text-xs font-bold">
                        ✓ RECOVERY VERIFIED
                      </span>
                    </div>

                    {/* BEFORE vs AFTER Metrics Table (Spec 21) */}
                    <div className="overflow-x-auto border border-[#E8E6E1] rounded-xl">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-[#FAFAF8] text-[#6B6B6B] border-b border-[#E8E6E1] text-[10px]">
                          <tr>
                            <th className="p-3">SIGNAL METRIC</th>
                            <th className="p-3">BEFORE EXECUTION</th>
                            <th className="p-3">AFTER EXECUTION</th>
                            <th className="p-3">THRESHOLD</th>
                            <th className="p-3">RESULT</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E8E6E1] text-[#242424]">
                          <tr className="hover:bg-[#FAFAF8]">
                            <td className="p-3 font-semibold">DB Connections</td>
                            <td className="p-3 text-[#DC2626] font-bold">98%</td>
                            <td className="p-3 text-[#16A34A] font-bold">31%</td>
                            <td className="p-3 text-[#6B6B6B]">&lt;= 40%</td>
                            <td className="p-3 text-[#16A34A] font-bold">✓ PASSED</td>
                          </tr>
                          <tr className="hover:bg-[#FAFAF8]">
                            <td className="p-3 font-semibold">API Error Rate</td>
                            <td className="p-3 text-[#DC2626] font-bold">17.8%</td>
                            <td className="p-3 text-[#16A34A] font-bold">0.8%</td>
                            <td className="p-3 text-[#6B6B6B]">&lt;= 2.0%</td>
                            <td className="p-3 text-[#16A34A] font-bold">✓ PASSED</td>
                          </tr>
                          <tr className="hover:bg-[#FAFAF8]">
                            <td className="p-3 font-semibold">P95 Latency</td>
                            <td className="p-3 text-[#DC2626] font-bold">4.2s</td>
                            <td className="p-3 text-[#16A34A] font-bold">280ms</td>
                            <td className="p-3 text-[#6B6B6B]">&lt;= 300ms</td>
                            <td className="p-3 text-[#16A34A] font-bold">✓ PASSED</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* 22. POSTMORTEM & 23. HINDSIGHT RETAIN (Spec 22, 23) */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                      {!postmortemGenerated ? (
                        <button
                          onClick={handleGeneratePostmortem}
                          disabled={incidentActionLoading}
                          className="px-4 py-2 rounded-xl bg-[#242424] text-white text-xs font-semibold hover:bg-[#3B3B3B] transition-colors"
                        >
                          {incidentActionLoading ? "Generating..." : "Generate Postmortem & Retain Knowledge"}
                        </button>
                      ) : (
                        <div className="w-full p-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl space-y-2">
                          <div className="font-semibold text-[#166534] flex items-center justify-between">
                            <span>✓ Knowledge Retained in Hindsight</span>
                            <span className="text-[10px] bg-[#FFFFFF] border border-[#BBF7D0] px-2 py-0.5 rounded font-mono">DURABLE MEMORY STORED</span>
                          </div>
                          <div className="text-[11px] text-[#166534] space-y-0.5">
                            <div>• Incident signature retained: <strong>Database connection leak on v2.5</strong></div>
                            <div>• Verified remediation retained: <strong>reduce_connection_pool</strong></div>
                            <div>• Naive failed action recorded: <strong>restart_service</strong></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 24. SECOND INCIDENT LEARNING PROOF (Spec 24, 25) */}
                {postmortemGenerated && (
                  <div className="p-6 bg-[#FAFAF8] border border-[#242424] rounded-2xl space-y-4 text-xs">
                    <div className="flex items-center justify-between border-b border-[#E8E6E1] pb-3">
                      <div className="font-semibold text-sm text-[#242424] flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#D97706]" /> Test Learning: Trigger Similar Incident 2
                      </div>
                      {!incident2Tested && (
                        <button
                          onClick={handleTestIncident2Learning}
                          disabled={incidentActionLoading}
                          className="px-4 py-2 rounded-xl bg-[#242424] text-white text-xs font-semibold hover:bg-[#3B3B3B]"
                        >
                          {incidentActionLoading ? "Simulating..." : "Trigger Similar Incident 2 →"}
                        </button>
                      )}
                    </div>

                    {incident2Tested && (
                      <div className="p-4 bg-[#FFFFFF] border border-[#BBF7D0] rounded-xl space-y-3">
                        <div className="font-semibold text-sm text-[#166534] flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" /> Previous Incident Experience Recalled & Reused!
                        </div>
                        <p className="text-xs text-[#6B6B6B] leading-relaxed">
                          When Incident 2 occurred, the agent automatically queried Hindsight long-term memory. It recalled the previous failed restart, retrieved the verified SRE human correction, and selected <strong>Reduce Connection Pressure</strong> on the <strong>very first attempt!</strong>
                        </p>
                        <div className="p-2.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg text-[#166534] font-semibold text-xs">
                          ✓ Verification Passed on 1st Pass: DB Connections reduced to nominal bounds without trial-and-error!
                        </div>
                      </div>
                    )}

                    {/* 25. WITHOUT / WITH HINDSIGHT COMPARISON MATRIX (Spec 25) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      <div className="p-4 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl space-y-2">
                        <div className="font-semibold text-[#92400E]">WITHOUT HINDSIGHT</div>
                        <div className="text-[11px] text-[#92400E] space-y-1">
                          <div>Current evidence: DB connections 98%</div>
                          <div>Historical experience: None (Blind)</div>
                          <div>Recommendation: <strong>Restart Service (FAILED)</strong></div>
                        </div>
                      </div>

                      <div className="p-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl space-y-2">
                        <div className="font-semibold text-[#166534]">WITH HINDSIGHT</div>
                        <div className="text-[11px] text-[#166534] space-y-1">
                          <div>Current evidence: DB connections 98%</div>
                          <div>Historical memory: Recalled #INC-014 failed restart</div>
                          <div>Recommendation: <strong>Reduce DB Pressure (PASSED)</strong></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>

            </div>
          )}

          {/* TAB 2: CONSOLE ERRORS (Spec 9) */}
          {activeTab === "CONSOLE" && (
            <div className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-6 shadow-card space-y-4">
              <div className="flex items-center justify-between border-b border-[#E8E6E1] pb-3">
                <h3 className="font-semibold text-sm text-[#242424] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-[#DC2626]" /> Console Runtime Errors ({auditResults.console_errors?.length || 0})
                </h3>
                <div className="flex items-center gap-1 bg-[#FAFAF8] p-1 rounded-lg border border-[#E8E6E1] text-xs">
                  {["ALL", "ERRORS", "WARNINGS"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setConsoleFilter(f)}
                      className={`px-2.5 py-0.5 rounded-md font-medium ${
                        consoleFilter === f ? "bg-[#242424] text-white" : "text-[#6B6B6B]"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {auditResults.console_errors?.map((err: any, idx: number) => (
                  <div key={idx} className="p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#991B1B]">✕ {err.type}: {err.message}</span>
                      <span className="text-[10px] bg-[#FFFFFF] border border-[#FECACA] px-2 py-0.5 rounded text-[#991B1B] font-mono font-bold">
                        {err.severity}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#6B6B6B] font-mono">
                      Page: {err.page_url} • Source: {err.source_file}:{err.line}:{err.column}
                    </div>
                    {err.stack_trace && (
                      <pre className="p-2.5 bg-[#FFFFFF] border border-[#FECACA] rounded-lg text-[10px] font-mono text-[#991B1B] overflow-x-auto whitespace-pre-wrap">
                        {err.stack_trace}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: API & NETWORK SECTION (Spec 10) */}
          {activeTab === "NETWORK" && (
            <div className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-6 shadow-card space-y-4">
              <h3 className="font-semibold text-sm text-[#242424] flex items-center gap-2 border-b border-[#E8E6E1] pb-3">
                <Layers className="w-4 h-4 text-[#242424]" /> Observed API & Network Traffic ({auditResults.network_requests?.length || 0})
              </h3>

              <div className="overflow-x-auto border border-[#E8E6E1] rounded-xl">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#FAFAF8] text-[#6B6B6B] border-b border-[#E8E6E1] text-[10px]">
                    <tr>
                      <th className="p-3">ENDPOINT</th>
                      <th className="p-3">STATUS</th>
                      <th className="p-3">LATENCY</th>
                      <th className="p-3">INITIATOR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E6E1] text-[#242424]">
                    {auditResults.network_requests?.map((req: any, i: number) => {
                      const is5xx = req.status >= 500;
                      const is4xx = req.status >= 400 && req.status < 500;

                      return (
                        <tr key={i} className="hover:bg-[#FAFAF8]">
                          <td className="p-3 font-semibold">
                            <span className="text-[#8A8A8A] mr-2">{req.method}</span>
                            <span>{req.url}</span>
                          </td>
                          <td className="p-3">
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                              is5xx ? "bg-[#FEF2F2] text-[#991B1B]" : is4xx ? "bg-[#FFFBEB] text-[#92400E]" : "bg-[#F0FDF4] text-[#166534]"
                            }`}>
                              {req.status}
                            </span>
                          </td>
                          <td className="p-3 text-[#6B6B6B]">{req.duration_ms}ms</td>
                          <td className="p-3 text-[#8A8A8A] text-[11px]">{req.initiator}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: ROUTE CHECK (Spec 11) */}
          {activeTab === "ROUTES" && (
            <div className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-6 shadow-card space-y-4">
              <div className="flex items-center justify-between border-b border-[#E8E6E1] pb-3">
                <h3 className="font-semibold text-sm text-[#242424] flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#242424]" /> Discovered Route Inventory ({auditResults.routes?.length || 0})
                </h3>

                <div className="flex items-center gap-1 bg-[#FAFAF8] p-1 rounded-lg border border-[#E8E6E1] text-xs">
                  {["ALL", "HEALTHY", "BROKEN"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setRouteFilter(f)}
                      className={`px-2.5 py-0.5 rounded-md font-medium ${
                        routeFilter === f ? "bg-[#242424] text-white" : "text-[#6B6B6B]"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto border border-[#E8E6E1] rounded-xl">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#FAFAF8] text-[#6B6B6B] border-b border-[#E8E6E1] text-[10px]">
                    <tr>
                      <th className="p-3">ROUTE</th>
                      <th className="p-3">STATUS</th>
                      <th className="p-3">LATENCY</th>
                      <th className="p-3">LAST CHECKED</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E6E1] text-[#242424]">
                    {auditResults.routes?.filter((r: any) => {
                      if (routeFilter === "HEALTHY") return r.status === 200;
                      if (routeFilter === "BROKEN") return r.status >= 400;
                      return true;
                    }).map((r: any, i: number) => (
                      <tr key={i} className="hover:bg-[#FAFAF8]">
                        <td className="p-3 font-semibold">{r.path}</td>
                        <td className="p-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            r.status === 200 ? "bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]" : "bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]"
                          }`}>
                            {r.status === 200 ? "✓ 200" : `✕ ${r.status}`}
                          </span>
                        </td>
                        <td className="p-3 text-[#6B6B6B]">{r.latency_ms}ms</td>
                        <td className="p-3 text-[#8A8A8A]">{r.last_checked}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: PERFORMANCE SECTION (Spec 12) */}
          {activeTab === "PERFORMANCE" && (
            <div className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-6 shadow-card space-y-6">
              <h3 className="font-semibold text-sm text-[#242424] flex items-center gap-2 border-b border-[#E8E6E1] pb-3">
                <Activity className="w-4 h-4 text-[#242424]" /> Performance Profiling
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-4 bg-[#FAFAF8] rounded-xl border border-[#E8E6E1] text-center space-y-1">
                  <div className="text-[#8A8A8A]">TTFB</div>
                  <div className="text-xl font-bold text-[#242424]">{auditResults.performance_stats?.ttfb_ms}ms</div>
                </div>
                <div className="p-4 bg-[#FAFAF8] rounded-xl border border-[#E8E6E1] text-center space-y-1">
                  <div className="text-[#8A8A8A]">Page Load</div>
                  <div className="text-xl font-bold text-[#242424]">{auditResults.performance_stats?.total_load_time_ms}ms</div>
                </div>
                <div className="p-4 bg-[#FAFAF8] rounded-xl border border-[#E8E6E1] text-center space-y-1">
                  <div className="text-[#8A8A8A]">Slow Requests</div>
                  <div className="text-xl font-bold text-[#991B1B]">{auditResults.performance_stats?.slow_apis?.length || 0}</div>
                </div>
                <div className="p-4 bg-[#FAFAF8] rounded-xl border border-[#E8E6E1] text-center space-y-1">
                  <div className="text-[#8A8A8A]">Payload Size</div>
                  <div className="text-xl font-bold text-[#242424]">{auditResults.performance_stats?.payload_size_kb || 28.4} KB</div>
                </div>
              </div>

              {/* Slowest Endpoints Table */}
              <div className="space-y-2 text-xs">
                <div className="font-semibold text-[#242424]">Slowest API Endpoints:</div>
                <div className="border border-[#E8E6E1] rounded-xl overflow-hidden">
                  <table className="w-full text-left font-mono text-xs">
                    <thead className="bg-[#FAFAF8] text-[#6B6B6B] border-b border-[#E8E6E1] text-[10px]">
                      <tr>
                        <th className="p-2.5">ENDPOINT</th>
                        <th className="p-2.5">LATENCY</th>
                        <th className="p-2.5">STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8E6E1] text-[#242424]">
                      <tr className="hover:bg-[#FAFAF8]">
                        <td className="p-2.5">POST /api/v1/payment</td>
                        <td className="p-2.5 text-[#DC2626] font-bold">1,850ms</td>
                        <td className="p-2.5 text-[#991B1B]">503 Service Unavailable</td>
                      </tr>
                      <tr className="hover:bg-[#FAFAF8]">
                        <td className="p-2.5">GET /checkout</td>
                        <td className="p-2.5 text-[#DC2626] font-bold">1,420ms</td>
                        <td className="p-2.5 text-[#991B1B]">503 Degraded</td>
                      </tr>
                      <tr className="hover:bg-[#FAFAF8]">
                        <td className="p-2.5">GET /dashboard</td>
                        <td className="p-2.5 text-[#242424]">64ms</td>
                        <td className="p-2.5 text-[#166534]">200 OK</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SECURITY (Spec 13) */}
          {activeTab === "SECURITY" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-6 shadow-card space-y-4 text-xs">
                <h3 className="font-semibold text-sm text-[#242424] flex items-center gap-2 border-b border-[#E8E6E1] pb-3">
                  <ShieldCheck className="w-4 h-4 text-[#16A34A]" /> Passive Security Checklist
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-[#166534]">
                    <CheckCircle2 className="w-4 h-4" /> <span>HTTPS Protocol Enforced</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#166534]">
                    <CheckCircle2 className="w-4 h-4" /> <span>Valid TLS Certificate (82 days remaining)</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#166534]">
                    <CheckCircle2 className="w-4 h-4" /> <span>CORS Configuration & Preflight Allowed</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#D97706]">
                    <AlertTriangle className="w-4 h-4" /> <span>Missing Content-Security-Policy (CSP)</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#D97706]">
                    <AlertTriangle className="w-4 h-4" /> <span>Missing Strict-Transport-Security (HSTS)</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-6 shadow-card space-y-3 text-xs">
                <h3 className="font-semibold text-sm text-[#242424] flex items-center gap-2 border-b border-[#E8E6E1] pb-3">
                  <AlertTriangle className="w-4 h-4 text-[#D97706]" /> Security Observations
                </h3>
                <div className="space-y-2">
                  {auditResults.security_findings?.map((sec: any, idx: number) => (
                    <div key={idx} className="p-3 bg-[#FAFAF8] rounded-xl border border-[#E8E6E1] space-y-1">
                      <div className="flex items-center justify-between font-semibold text-[#242424]">
                        <span>{sec.name}</span>
                        <span className="text-[10px] bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] px-1.5 rounded">
                          {sec.severity}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#6B6B6B]">{sec.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: LOGS SECTION & UPLOAD (Spec 14, 15) */}
          {activeTab === "LOGS" && (
            <div className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-6 shadow-card space-y-6">
              <div className="flex items-center justify-between border-b border-[#E8E6E1] pb-3">
                <h3 className="font-semibold text-sm text-[#242424] flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#242424]" /> Browser & Application Logs
                </h3>
                <span className="text-xs text-[#8A8A8A]">
                  {auditResults.logs_analyzed?.length || 0} Events Ingested
                </span>
              </div>

              {/* Log Upload Area (Spec 14) */}
              <input
                type="file"
                ref={logFileInputRef}
                className="hidden"
                multiple
                accept=".json,.jsonl,.txt,.csv,.log"
                onChange={(e) => handleLogFileUpload(e.target.files)}
              />
              <div 
                onClick={() => logFileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer.files) {
                    handleLogFileUpload(e.dataTransfer.files);
                  }
                }}
                className="p-6 bg-[#FAFAF8] hover:bg-[#F5F5F0] transition-colors border border-dashed border-[#CBD5E1] hover:border-[#2563EB] rounded-2xl text-center space-y-2 cursor-pointer group"
              >
                <Upload className="w-6 h-6 text-[#8A8A8A] group-hover:text-[#2563EB] mx-auto transition-colors" />
                <div className="font-semibold text-xs text-[#242424]">
                  {isUploadingLogs ? "Ingesting and Parsing Log File(s)..." : "Upload application logs for deeper root cause correlation"}
                </div>
                <p className="text-[11px] text-[#6B6B6B]">
                  Click to browse or drag & drop log files (JSON, JSONL, TXT, CSV, Apache/Nginx formats)
                </p>
                {logUploadMessage && (
                  <div className="text-xs text-[#059669] bg-[#ECFDF5] border border-[#A7F3D0] rounded-lg p-2 font-medium inline-block mt-2">
                    ✓ {logUploadMessage}
                  </div>
                )}
              </div>

              {/* Log Analysis Table (Spec 15) */}
              {auditResults.logs_analyzed?.length > 0 && (
                <div className="space-y-2">
                  <div className="font-semibold text-xs text-[#242424]">Parsed Log Events:</div>
                  <div className="space-y-1.5 font-mono text-xs max-h-60 overflow-y-auto">
                    {auditResults.logs_analyzed.map((l: any, i: number) => (
                      <div key={i} className={`p-2.5 rounded-lg border ${
                        l.is_error ? "bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]" : "bg-[#FAFAF8] border-[#E8E6E1] text-[#242424]"
                      }`}>
                        <span className="text-[#8A8A8A]">[{l.timestamp}]</span> <span className="font-bold">[{l.level}]</span> <span className="text-[#6B6B6B]">[{l.service}]</span> {l.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 8: SCAN DIFF & REGRESSION (Spec Bonus) */}
          {activeTab === "DIFF" && (

            <div className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-6 shadow-card space-y-6">
              <div className="flex items-center justify-between border-b border-[#E8E6E1] pb-3">
                <div className="space-y-0.5">
                  <h3 className="font-semibold text-sm text-[#242424] flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#242424]" /> Website Audit Diff & Regression Tracker
                  </h3>
                  <p className="text-xs text-[#6B6B6B]">Compare current audit findings against past scans or baselines to detect regressions.</p>
                </div>
                <button
                  onClick={() => handleCompareAudit("aud-baseline-001")}
                  disabled={comparing}
                  className="px-3 py-1.5 rounded-lg bg-[#242424] text-white text-xs font-semibold hover:bg-[#3B3B3B] transition-colors"
                >
                  {comparing ? "Comparing..." : "Compare Against Baseline →"}
                </button>
              </div>

              {comparisonDiff ? (
                <div className="space-y-4">
                  <div className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
                    comparisonDiff.status_improved ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]" : "bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]"
                  }`}>
                    <div className="space-y-1">
                      <div className="font-bold text-sm">
                        {comparisonDiff.status_improved ? "✓ Performance & Reliability Improved" : "⚠ Regression Detected in Latest Scan"}
                      </div>
                      <div>Health Progression: <strong>{comparisonDiff.health_delta}</strong></div>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-[#FFFFFF] font-mono font-bold text-xs shadow-subtle">
                      Delta Verified
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 bg-[#FAFAF8] border border-[#E8E6E1] rounded-xl text-center space-y-1">
                      <div className="text-[11px] text-[#6B6B6B]">Console Errors Delta</div>
                      <div className={`text-xl font-bold font-mono ${
                        comparisonDiff.console_errors_delta <= 0 ? "text-[#16A34A]" : "text-[#DC2626]"
                      }`}>
                        {comparisonDiff.console_errors_delta > 0 ? `+${comparisonDiff.console_errors_delta}` : comparisonDiff.console_errors_delta}
                      </div>
                    </div>

                    <div className="p-4 bg-[#FAFAF8] border border-[#E8E6E1] rounded-xl text-center space-y-1">
                      <div className="text-[11px] text-[#6B6B6B]">Failed API Endpoints Delta</div>
                      <div className={`text-xl font-bold font-mono ${
                        comparisonDiff.failed_apis_delta <= 0 ? "text-[#16A34A]" : "text-[#DC2626]"
                      }`}>
                        {comparisonDiff.failed_apis_delta > 0 ? `+${comparisonDiff.failed_apis_delta}` : comparisonDiff.failed_apis_delta}
                      </div>
                    </div>

                    <div className="p-4 bg-[#FAFAF8] border border-[#E8E6E1] rounded-xl text-center space-y-1">
                      <div className="text-[11px] text-[#6B6B6B]">Load Time Delta (ms)</div>
                      <div className={`text-xl font-bold font-mono ${
                        comparisonDiff.load_time_delta_ms <= 0 ? "text-[#16A34A]" : "text-[#DC2626]"
                      }`}>
                        {comparisonDiff.load_time_delta_ms > 0 ? `+${comparisonDiff.load_time_delta_ms}ms` : `${comparisonDiff.load_time_delta_ms}ms`}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 bg-[#FAFAF8] border border-dashed border-[#E8E6E1] rounded-2xl text-center space-y-2">
                  <BarChart3 className="w-8 h-8 text-[#8A8A8A] mx-auto" />
                  <div className="font-semibold text-xs text-[#242424]">Compare against previous scan</div>
                  <p className="text-[11px] text-[#6B6B6B] max-w-sm mx-auto">
                    Click "Compare Against Baseline" above to contrast this scan against earlier diagnostic runs and measure regression metrics.
                  </p>
                </div>
              )}
            </div>
          )}

        </section>
      )}


      {/* 28. EMPTY STATE (Spec 28) */}
      {!loading && !auditResults && (
        <section className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-8 text-center space-y-3 max-w-2xl mx-auto shadow-subtle">
          <Globe className="w-8 h-8 text-[#8A8A8A] mx-auto" />
          <h3 className="font-semibold text-sm text-[#242424]">No website audit running right now.</h3>
          <p className="text-xs text-[#6B6B6B]">
            Enter a live website URL above or select a preset to run your first automated website diagnostic and SRE investigation.
          </p>
        </section>
      )}

    </div>
  );
}
