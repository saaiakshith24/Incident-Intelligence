"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, ArrowRight, ShieldAlert, Filter, Search, Layers, Clock } from "lucide-react";
import { fetchErrors } from "@/lib/api";

export default function ErrorCenterPage() {
  const [errors, setErrors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const loadErrors = async () => {
    setLoading(true);
    try {
      const data = await fetchErrors();
      setErrors(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadErrors();
  }, []);

  const filteredErrors = errors.filter(err => {
    if (filterSeverity !== "ALL" && err.severity !== filterSeverity) return false;
    if (searchQuery && !err.message?.toLowerCase().includes(searchQuery.toLowerCase()) && !err.type?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-6 shadow-card">
        <div>
          <h1 className="text-xl font-semibold text-[#242424]">Centralized Error & Defect Center</h1>
          <p className="text-xs text-[#6B6B6B]">Deduplicated runtime exceptions, network failures, and backend database errors</p>
        </div>

        <button
          onClick={loadErrors}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FAFAF8] hover:bg-[#F4F3EE] border border-[#E8E6E1] text-[#242424] rounded-lg text-xs font-medium transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Errors</span>
        </button>
      </div>

      {/* Search & Severity Filters (Spec 42, 43) */}
      <div className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-4 shadow-card flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#8A8A8A] absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search errors by message or signature..."
            className="w-full bg-[#FAFAF8] border border-[#E8E6E1] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#242424] placeholder-[#8A8A8A] focus:outline-none focus:border-[#242424]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-[#6B6B6B]">Severity:</span>
          {["ALL", "CRITICAL", "HIGH", "MEDIUM"].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                filterSeverity === sev
                  ? "bg-[#242424] text-white border-[#242424]"
                  : "bg-[#FAFAF8] text-[#6B6B6B] border-[#E8E6E1] hover:text-[#242424]"
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Deduplicated Errors List (Spec 43) */}
      <div className="space-y-3">
        {filteredErrors.map((err) => (
          <div
            key={err.id}
            className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#E8E6E1] shadow-subtle space-y-3 hover:border-[#8A8A8A] transition-colors"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8E6E1] pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-[#8A8A8A]">{err.id}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                  err.severity === "CRITICAL" ? "bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]" : "bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]"
                }`}>
                  {err.severity}
                </span>
                <span className="text-xs font-semibold text-[#242424]">{err.type}</span>
              </div>

              <div className="flex items-center gap-3 text-xs text-[#6B6B6B]">
                <span>Occurrences: <strong className="text-[#242424] font-semibold">{err.occurrences.toLocaleString()}</strong></span>
                <span>•</span>
                <span>First seen: {err.first_seen}</span>
                <span>•</span>
                <span>Last seen: {err.last_seen}</span>
              </div>
            </div>

            <div className="text-xs font-mono text-[#991B1B] bg-[#FEF2F2] p-3 rounded-xl border border-[#FECACA]">
              {err.message}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#6B6B6B] pt-1">
              <div className="space-x-2">
                <span>Affected Routes:</span>
                {(err.affected_routes || []).map((r: string) => (
                  <span key={r} className="px-2 py-0.5 rounded-md bg-[#FAFAF8] border border-[#E8E6E1] text-[#242424] font-mono text-[11px]">
                    {r}
                  </span>
                ))}
              </div>

              {err.related_incident_id && (
                <Link
                  href={`/incidents/${err.related_incident_id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#FAFAF8] hover:bg-[#F4F3EE] border border-[#E8E6E1] text-[#242424] font-medium transition-colors"
                >
                  <span>Linked Incident ({err.related_incident_id})</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
