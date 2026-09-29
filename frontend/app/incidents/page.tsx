"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldAlert, RefreshCw, ArrowRight, Zap, Filter, Search, Brain, CheckCircle2 } from "lucide-react";
import { fetchIncidents, injectIncident } from "@/lib/api";

export default function IncidentsListPage() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [injecting, setInjecting] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchIncidents();
      setIncidents(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInject = async (scenario: string) => {
    setInjecting(true);
    try {
      const newInc = await injectIncident(scenario);
      await loadData();
      window.location.href = `/incidents/${newInc.id}`;
    } catch (e) {
      console.error(e);
    } finally {
      setInjecting(false);
    }
  };

  const filtered = incidents.filter(inc => {
    if (filterSeverity !== "ALL" && inc.severity !== filterSeverity) return false;
    if (searchQuery && !inc.title?.toLowerCase().includes(searchQuery.toLowerCase()) && !inc.id?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-6 shadow-card">
        <div>
          <h1 className="text-xl font-semibold text-[#242424]">Operational Incidents</h1>
          <p className="text-xs text-[#6B6B6B]">All detected, investigating, and verified production incidents</p>
        </div>

        <button
          onClick={() => handleInject("INCIDENT_1_DB_EXHAUSTION")}
          disabled={injecting}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#242424] hover:bg-[#3B3B3B] transition-colors shadow-subtle"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Inject Test Incident</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-4 shadow-card flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#8A8A8A] absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by incident ID or title..."
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

      {/* Incidents Table (Spec 18) */}
      <div className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAFAF8] text-[#6B6B6B] border-b border-[#E8E6E1] text-[11px]">
              <tr>
                <th className="p-3.5 font-medium">Incident</th>
                <th className="p-3.5 font-medium">Affected Service</th>
                <th className="p-3.5 font-medium">Severity</th>
                <th className="p-3.5 font-medium">Root Cause Hypothesis</th>
                <th className="p-3.5 font-medium">Status</th>
                <th className="p-3.5 font-medium">Memory Used</th>
                <th className="p-3.5 font-medium">Detected</th>
                <th className="p-3.5 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E6E1] text-[#242424]">
              {filtered.map((inc) => (
                <tr key={inc.id} className="hover:bg-[#FAFAF8] transition-colors">
                  <td className="p-3.5 font-semibold">
                    <Link href={`/incidents/${inc.id}`} className="hover:underline flex items-center gap-1.5 text-[#242424]">
                      <ShieldAlert className="w-3.5 h-3.5 text-[#DC2626]" />
                      <span>{inc.id}</span>
                    </Link>
                    <div className="text-[11px] text-[#6B6B6B] font-normal">{inc.title}</div>
                  </td>
                  <td className="p-3.5 text-[#6B6B6B]">
                    {(inc.affected_services || ["payment-service"]).join(", ")}
                  </td>
                  <td className="p-3.5">
                    <span className="bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA] text-[10px] px-2 py-0.5 rounded-full font-medium">
                      {inc.severity || "CRITICAL"}
                    </span>
                  </td>
                  <td className="p-3.5 text-[#6B6B6B] max-w-xs truncate">
                    {inc.investigation?.rca?.summary || "Database Connection Pool Exhaustion (Payment v2.5 leak)"}
                  </td>
                  <td className="p-3.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      inc.status === "RESOLVED" || inc.status === "POSTMORTEM_CREATED"
                        ? "bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]"
                        : "bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]"
                    }`}>
                      {inc.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-[#166534] font-medium flex items-center gap-1">
                    <Brain className="w-3.5 h-3.5" />
                    <span>Hindsight</span>
                  </td>
                  <td className="p-3.5 text-[#8A8A8A]">
                    {inc.created_at || "Recent"}
                  </td>
                  <td className="p-3.5 text-right">
                    <Link
                      href={`/incidents/${inc.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#FAFAF8] hover:bg-[#F4F3EE] border border-[#E8E6E1] text-[#242424] rounded-lg text-xs font-medium transition-colors"
                    >
                      <span>Workspace</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
