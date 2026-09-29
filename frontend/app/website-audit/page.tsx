"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Globe, Play, Search, AlertTriangle, CheckCircle2, ShieldCheck, Activity, 
  Lock, ArrowRight, RefreshCw, Cpu, Layers, FileText, AlertCircle, Sparkles,
  Terminal, Server, Clock, Brain, Upload
} from "lucide-react";
import { startWebsiteAudit, fetchAuditProgress, fetchAuditResults, fetchAudits, ingestLogs } from "@/lib/api";

export default function WebsiteAuditPage() {
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
  const [pastAudits, setPastAudits] = useState<any[]>([]);

  // Selected tab in results
  const [activeTab, setActiveTab] = useState("OVERVIEW");

  const loadPastAudits = async () => {
    try {
      const list = await fetchAudits();
      setPastAudits(list);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadPastAudits();
  }, []);

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
          await loadPastAudits();
        } else if (progress.status === "FAILED") {
          clearInterval(interval);
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeAuditId]);

  const handleStartAudit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!targetUrl.trim() || loading) return;

    setLoading(true);
    setAuditResults(null);
    setAuditStatus({ progress_pct: 5, stage: "Validating URL & checking SSRF rules..." });

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
    }
  };

  const getHealthBadge = (health: string) => {
    switch (health) {
      case "CRITICAL":
        return <span className="bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA] text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> Critical Issues</span>;
      case "DEGRADED":
        return <span className="bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Degraded</span>;
      default:
        return <span className="bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0] text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Healthy</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-6 sm:p-8 shadow-card space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#166534]">
          <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse"></span>
          <span>Live Website & Microservice Diagnostic Scanner</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold text-[#242424]">
          Website Audit & Incident Discovery
        </h1>
        <p className="text-xs text-[#6B6B6B] leading-relaxed max-w-2xl">
          Enter any live URL or microservice endpoint. The auditor checks HTTP availability, crawls routes, detects console & network exceptions, analyzes CORS/TLS security, and correlates findings with Hindsight operational memory.
        </p>
      </div>

      {/* URL Input Form (Spec 3, 41) */}
      <div className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-6 shadow-card space-y-4">
        <form onSubmit={handleStartAudit} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Globe className="w-4 h-4 text-[#8A8A8A] absolute left-3.5 top-3" />
              <input
                type="text"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://example.com or http://localhost:3000"
                className="w-full bg-[#FAFAF8] border border-[#E8E6E1] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#242424] font-medium focus:outline-none focus:border-[#242424] transition-colors"
                required
              />
            </div>

            {/* Scan Mode Toggle */}
            <div className="flex items-center gap-1 bg-[#FAFAF8] p-1 rounded-xl border border-[#E8E6E1] text-xs">
              {["QUICK_SCAN", "FULL_AUDIT", "CONTINUOUS"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setScanMode(m)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    scanMode === m
                      ? "bg-[#FFFFFF] text-[#242424] font-semibold shadow-subtle border border-[#E8E6E1]"
                      : "text-[#6B6B6B] hover:text-[#242424]"
                  }`}
                >
                  {m.replace(/_/g, " ")}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-[#242424] text-white text-xs font-semibold hover:bg-[#3B3B3B] transition-colors shadow-subtle flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 fill-current ${loading ? "animate-spin" : ""}`} />
              <span>{loading ? "Auditing Target..." : "Start Full Audit"}</span>
            </button>
          </div>

          {/* Quick Preset Scenarios */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-[#8A8A8A]">Preset Demos:</span>
            <button
              type="button"
              onClick={() => handlePresetSelect("http://localhost:3000", "FULL_AUDIT")}
              className="px-2.5 py-1 rounded-lg bg-[#FAFAF8] border border-[#E8E6E1] text-[#6B6B6B] hover:text-[#242424] hover:bg-[#F4F3EE]"
            >
              Local Platform Target
            </button>
            <button
              type="button"
              onClick={() => handlePresetSelect("https://api.payment-gateway.internal/checkout", "FULL_AUDIT", "ERROR: Connection pool exhausted (98/100 connections)\nFATAL: PSQLException: remaining connection slots are reserved\nWARN: PaymentTransactionWorker connection leak in v2.5.0")}
              className="px-2.5 py-1 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] hover:bg-[#FEE2E2]"
            >
              Simulate DB Leak Outage (with Server Logs)
            </button>
            <button
              type="button"
              onClick={() => handlePresetSelect("https://order-service.production.internal/v3.1", "FULL_AUDIT", "ERROR: NullPointerException at OrderValidator.java:142\nERROR: Failed to serialize JSON payload for checkout")}
              className="px-2.5 py-1 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] hover:bg-[#FEF3C7]"
            >
              Simulate Bad Release v3.1 (NPE Crash)
            </button>
          </div>

          {/* Log Upload Drawer Toggle */}
          <div className="pt-2 border-t border-[#E8E6E1]">
            <button
              type="button"
              onClick={() => setShowLogsDrawer(!showLogsDrawer)}
              className="text-xs text-[#6B6B6B] hover:text-[#242424] flex items-center gap-1.5 font-medium"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>{showLogsDrawer ? "Hide Server Logs Input" : "+ Attach Server Logs for Deep Correlation"}</span>
            </button>

            {showLogsDrawer && (
              <div className="mt-3 space-y-2">
                <label className="text-xs font-medium text-[#242424]">Raw Application / Nginx / Docker Logs (JSON, Stack Traces, or Text):</label>
                <textarea
                  value={logsContent}
                  onChange={(e) => setLogsContent(e.target.value)}
                  placeholder="Paste application logs or stack traces here..."
                  rows={4}
                  className="w-full bg-[#FAFAF8] border border-[#E8E6E1] rounded-xl p-3 text-xs font-mono text-[#242424] focus:outline-none focus:border-[#242424]"
                />
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Progress & Live Audit Status (Spec 41, 51) */}
      {loading && auditStatus && (
        <div className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#242424] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#242424] animate-spin" /> Audit In Progress...
            </span>
            <span className="font-mono text-[#6B6B6B]">{auditStatus.progress_pct}%</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 rounded-full bg-[#FAFAF8] border border-[#E8E6E1] overflow-hidden">
            <div 
              className="h-full bg-[#242424] transition-all duration-300"
              style={{ width: `${auditStatus.progress_pct}%` }}
            ></div>
          </div>

          <p className="text-xs text-[#6B6B6B] italic">{auditStatus.stage}</p>
        </div>
      )}

      {/* Audit Results Dashboard (Spec 41) */}
      {auditResults && (
        <div className="space-y-6">
          
          {/* Top Summary Card */}
          <div className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-6 shadow-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E6E1] pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[#8A8A8A]">Audit ID: {auditResults.audit_id}</span>
                  <span className="text-[#8A8A8A]">•</span>
                  <span className="text-xs text-[#6B6B6B]">{auditResults.timestamp}</span>
                </div>
                <h2 className="text-lg font-semibold text-[#242424]">{auditResults.url}</h2>
              </div>
              <div>{getHealthBadge(auditResults.health_status)}</div>
            </div>

            {/* Health Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div className="p-3 bg-[#FAFAF8] rounded-xl border border-[#E8E6E1] text-center">
                <div className="text-base font-bold text-[#242424]">{auditResults.health_score}/100</div>
                <div className="text-[11px] text-[#6B6B6B]">Health Score</div>
              </div>
              <div className="p-3 bg-[#FAFAF8] rounded-xl border border-[#E8E6E1] text-center">
                <div className="text-base font-bold text-[#242424]">{auditResults.http_status}</div>
                <div className="text-[11px] text-[#6B6B6B]">HTTP Status</div>
              </div>
              <div className="p-3 bg-[#FAFAF8] rounded-xl border border-[#E8E6E1] text-center">
                <div className="text-base font-bold text-[#242424]">{auditResults.performance_stats?.ttfb_ms}ms</div>
                <div className="text-[11px] text-[#6B6B6B]">TTFB Latency</div>
              </div>
              <div className="p-3 bg-[#FEF2F2] rounded-xl border border-[#FECACA] text-center">
                <div className="text-base font-bold text-[#991B1B]">{auditResults.console_errors?.length || 0}</div>
                <div className="text-[11px] text-[#991B1B]">Console Errors</div>
              </div>
              <div className="p-3 bg-[#FFFBEB] rounded-xl border border-[#FDE68A] text-center">
                <div className="text-base font-bold text-[#92400E]">{auditResults.security_findings?.length || 0}</div>
                <div className="text-[11px] text-[#92400E]">Security Findings</div>
              </div>
            </div>

            {/* Correlated Incident Callout (Spec 16, 17) */}
            {auditResults.correlated_incident && (
              <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#991B1B]">
                    <AlertTriangle className="w-4 h-4 text-[#DC2626]" />
                    <span>Correlated Production Incident Detected ({auditResults.correlated_incident.id})</span>
                  </div>
                  <p className="text-xs text-[#991B1B]">{auditResults.correlated_incident.title}</p>
                  <p className="text-[11px] text-[#6B6B6B]">Hypothesis: {auditResults.correlated_incident.root_cause_hypothesis}</p>
                </div>

                <Link
                  href={`/incidents/${auditResults.correlated_incident.id}`}
                  className="px-4 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-subtle shrink-0"
                >
                  <span>Open Investigation Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* Results Navigation Tabs (Spec 41) */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-[#E8E6E1] pb-2 text-xs">
            {[
              { id: "OVERVIEW", label: "Overview & Evidence" },
              { id: "ROUTES", label: `Routes (${auditResults.routes?.length || 0})` },
              { id: "CONSOLE", label: `Console Errors (${auditResults.console_errors?.length || 0})` },
              { id: "NETWORK", label: `Network & APIs (${auditResults.network_requests?.length || 0})` },
              { id: "SECURITY", label: `Security & TLS (${auditResults.security_findings?.length || 0})` },
              { id: "LOGS", label: `Logs & Correlation (${auditResults.logs_analyzed?.length || 0})` }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  activeTab === t.id
                    ? "bg-[#242424] text-white shadow-subtle"
                    : "bg-[#FAFAF8] text-[#6B6B6B] hover:text-[#242424] hover:bg-[#F4F3EE]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Overview */}
          {activeTab === "OVERVIEW" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Summary & Performance */}
              <div className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-5 shadow-card space-y-3 text-xs">
                <h3 className="font-semibold text-sm text-[#242424] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#242424]" /> Performance Profiling
                </h3>
                <div className="space-y-2 text-[#6B6B6B]">
                  <div className="flex justify-between py-1 border-b border-[#E8E6E1]">
                    <span>DNS Resolution Time:</span>
                    <strong className="text-[#242424]">{auditResults.performance_stats?.dns_lookup_ms}ms</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E8E6E1]">
                    <span>TCP Connection Time:</span>
                    <strong className="text-[#242424]">{auditResults.performance_stats?.tcp_handshake_ms}ms</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E8E6E1]">
                    <span>Time to First Byte (TTFB):</span>
                    <strong className="text-[#242424]">{auditResults.performance_stats?.ttfb_ms}ms</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E8E6E1]">
                    <span>Total Page Load Time:</span>
                    <strong className="text-[#242424]">{auditResults.performance_stats?.total_load_time_ms}ms</strong>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Discovered Assets:</span>
                    <strong className="text-[#242424]">{auditResults.performance_stats?.asset_count} items</strong>
                  </div>
                </div>
              </div>

              {/* Hindsight Memories Recalled */}
              <div className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-5 shadow-card space-y-3 text-xs">
                <h3 className="font-semibold text-sm text-[#242424] flex items-center gap-2">
                  <Brain className="w-4 h-4 text-[#242424]" /> Recalled Operational Experience
                </h3>
                <div className="space-y-2">
                  {auditResults.recalled_memories && auditResults.recalled_memories.length > 0 ? (
                    auditResults.recalled_memories.map((m: any, idx: number) => (
                      <div key={idx} className="p-3 bg-[#FAFAF8] rounded-xl border border-[#E8E6E1] space-y-1">
                        <div className="font-semibold text-[#242424] flex items-center justify-between">
                          <span>{m.memory?.title}</span>
                          <span className="text-[10px] bg-[#FFFFFF] border border-[#E8E6E1] px-1.5 py-0.2 rounded font-mono">{m.memory?.memory_type}</span>
                        </div>
                        <p className="text-[11px] text-[#6B6B6B] line-clamp-2">{m.memory?.content}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-[#8A8A8A] italic">No historical memory matches found.</div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* Tab 2: Discovered Routes (Spec 6) */}
          {activeTab === "ROUTES" && (
            <div className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-5 shadow-card space-y-4">
              <h3 className="font-semibold text-sm text-[#242424] flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#242424]" /> Route Inventory & Health
              </h3>
              <div className="overflow-x-auto border border-[#E8E6E1] rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAFAF8] text-[#6B6B6B] border-b border-[#E8E6E1] text-[11px]">
                    <tr>
                      <th className="p-3 font-medium">Route Path</th>
                      <th className="p-3 font-medium">Type</th>
                      <th className="p-3 font-medium">Status</th>
                      <th className="p-3 font-medium">Latency</th>
                      <th className="p-3 font-medium">Last Checked</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E6E1] text-[#242424]">
                    {auditResults.routes?.map((r: any, i: number) => (
                      <tr key={i} className="hover:bg-[#FAFAF8]">
                        <td className="p-3 font-mono font-semibold">{r.path}</td>
                        <td className="p-3 text-[#6B6B6B]">{r.type}</td>
                        <td className="p-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            r.status === 200 ? "bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]" : "bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]"
                          }`}>
                            HTTP {r.status}
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

          {/* Tab 3: Console Errors (Spec 8) */}
          {activeTab === "CONSOLE" && (
            <div className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-5 shadow-card space-y-4">
              <h3 className="font-semibold text-sm text-[#242424] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#DC2626]" /> Browser Console Exceptions ({auditResults.console_errors?.length || 0})
              </h3>
              <div className="space-y-3">
                {auditResults.console_errors?.length > 0 ? (
                  auditResults.console_errors.map((err: any, i: number) => (
                    <div key={i} className="p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#991B1B]">{err.type}: {err.message}</span>
                        <span className="bg-[#FFFFFF] text-[#991B1B] border border-[#FECACA] text-[10px] px-2 py-0.5 rounded font-mono font-bold">
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
                  ))
                ) : (
                  <div className="text-xs text-[#166534] p-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> No console JavaScript exceptions captured.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 4: Network & APIs (Spec 9, 10, 11) */}
          {activeTab === "NETWORK" && (
            <div className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-5 shadow-card space-y-4">
              <h3 className="font-semibold text-sm text-[#242424] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#242424]" /> Observed Network Calls & Discovered APIs
              </h3>
              <div className="overflow-x-auto border border-[#E8E6E1] rounded-xl">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#FAFAF8] text-[#6B6B6B] border-b border-[#E8E6E1] text-[10px]">
                    <tr>
                      <th className="p-3">METHOD</th>
                      <th className="p-3">URL / ENDPOINT</th>
                      <th className="p-3">STATUS</th>
                      <th className="p-3">DURATION</th>
                      <th className="p-3">INITIATOR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E6E1] text-[#242424]">
                    {auditResults.network_requests?.map((req: any, i: number) => (
                      <tr key={i} className="hover:bg-[#FAFAF8]">
                        <td className="p-3 font-bold text-[#242424]">{req.method}</td>
                        <td className="p-3 truncate max-w-sm">{req.url}</td>
                        <td className="p-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            req.status < 400 ? "bg-[#F0FDF4] text-[#166534]" : "bg-[#FEF2F2] text-[#991B1B]"
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="p-3 text-[#6B6B6B]">{req.duration_ms}ms</td>
                        <td className="p-3 text-[#8A8A8A] text-[11px]">{req.initiator}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 5: Security & TLS (Spec 12, 14) */}
          {activeTab === "SECURITY" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-5 shadow-card space-y-3 text-xs">
                <h3 className="font-semibold text-sm text-[#242424] flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#242424]" /> SSL / TLS Certificate Status
                </h3>
                <div className="space-y-2 text-[#6B6B6B]">
                  <div className="flex justify-between py-1 border-b border-[#E8E6E1]">
                    <span>HTTPS Active:</span>
                    <strong className="text-[#242424]">{auditResults.ssl_info?.https_active ? "Yes" : "No"}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E8E6E1]">
                    <span>Certificate Issuer:</span>
                    <strong className="text-[#242424]">{auditResults.ssl_info?.issuer}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E8E6E1]">
                    <span>Validity Status:</span>
                    <strong className="text-[#166534]">{auditResults.ssl_info?.status}</strong>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Days Until Expiry:</span>
                    <strong className="text-[#242424]">{auditResults.ssl_info?.expires_days} days</strong>
                  </div>
                </div>
              </div>

              <div className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-5 shadow-card space-y-3 text-xs">
                <h3 className="font-semibold text-sm text-[#242424] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#242424]" /> Security Headers Audit
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

          {/* Tab 6: Logs & Correlation (Spec 15, 16) */}
          {activeTab === "LOGS" && (
            <div className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-5 shadow-card space-y-4">
              <div className="flex items-center justify-between border-b border-[#E8E6E1] pb-3">
                <h3 className="font-semibold text-sm text-[#242424] flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#242424]" /> Parsed Server Logs & Incident Correlation
                </h3>
                <span className="text-xs text-[#8A8A8A]">
                  {auditResults.logs_analyzed?.length || 0} Events Ingested
                </span>
              </div>

              {/* Interactive Log Upload Dropzone */}
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
                className="p-5 bg-[#FAFAF8] hover:bg-[#F5F5F0] transition-colors border border-dashed border-[#CBD5E1] hover:border-[#2563EB] rounded-2xl text-center space-y-2 cursor-pointer group"
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

              {auditResults.logs_analyzed?.length > 0 ? (
                <div className="space-y-2 font-mono text-xs max-h-80 overflow-y-auto">
                  {auditResults.logs_analyzed.map((l: any, i: number) => (
                    <div key={i} className={`p-2.5 rounded-lg border ${l.is_error ? "bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]" : "bg-[#FAFAF8] border-[#E8E6E1] text-[#242424]"}`}>
                      <span className="text-[#8A8A8A]">[{l.timestamp}]</span> <span className="font-bold">[{l.level}]</span> <span className="text-[#6B6B6B]">[{l.service}]</span> {l.message}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-[#8A8A8A] italic p-4 bg-[#FAFAF8] border border-[#E8E6E1] rounded-xl text-center">
                  No server log files uploaded yet. Click or drag & drop log files above to parse and correlate.
                </div>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  );
}
