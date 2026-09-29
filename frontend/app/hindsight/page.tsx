"use client";

import React, { useState, useEffect } from "react";
import { Brain, Search, Filter, Plus, AlertCircle, UserCheck, ShieldCheck, CheckCircle2, FileText, Sparkles } from "lucide-react";
import { searchMemories, retainMemory } from "@/lib/api";

export default function HindsightMemoryPage() {
  const [memories, setMemories] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // New memory form state
  const [memType, setMemType] = useState("CORRECTION");
  const [incType, setIncType] = useState("INCIDENT_1_DB_EXHAUSTION");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [keywords, setKeywords] = useState("");

  const loadMemories = async () => {
    setLoading(true);
    try {
      const data = await searchMemories(query);
      const parsed = data.map((item: any) => item.memory ? item.memory : item);
      setMemories(parsed);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMemories();
  }, [query]);

  const handleRetainNewMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const kwList = keywords.split(",").map(k => k.trim()).filter(Boolean);
      await retainMemory({
        memory_type: memType,
        incident_type: incType,
        title,
        content,
        keywords: kwList,
        metadata_json: { source: "MANUAL_SRE_RETAIN" }
      });
      setShowAddModal(false);
      setTitle("");
      setContent("");
      setKeywords("");
      await loadMemories();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredMemories = memories.filter(m => {
    if (selectedType === "ALL") return true;
    return m.memory_type === selectedType;
  });

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "FAILURE":
        return <span className="bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA] text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Failure Memory</span>;
      case "CORRECTION":
        return <span className="bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0] text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><UserCheck className="w-3 h-3" /> SRE Correction</span>;
      case "VERIFICATION":
        return <span className="bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE] text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Verification</span>;
      default:
        return <span className="bg-[#FAFAF8] text-[#242424] border border-[#E8E6E1] text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><FileText className="w-3 h-3" /> {type}</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-6 shadow-card">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-[#242424]" />
            <h1 className="text-xl font-semibold text-[#242424]">Operational Memory (Hindsight)</h1>
          </div>
          <p className="text-xs text-[#6B6B6B]">
            Durable long-term operational knowledge, historical failure records, and verified engineer corrections
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#242424] hover:bg-[#3B3B3B] transition-colors shadow-subtle"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Retain New Memory</span>
        </button>
      </div>

      {/* Search & Categories Filter (Spec 30) */}
      <div className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-5 shadow-card space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-[#8A8A8A] absolute left-3.5 top-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search operational memory by symptom, service, failed action, or SRE correction..."
            className="w-full bg-[#FAFAF8] border border-[#E8E6E1] rounded-xl pl-10 pr-4 py-2 text-xs text-[#242424] placeholder-[#8A8A8A] focus:outline-none focus:border-[#242424]"
          />
        </div>

        {/* Categories (Spec 30) */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#E8E6E1]">
          <span className="text-xs text-[#6B6B6B] mr-2">Category:</span>
          {["ALL", "FAILURE", "CORRECTION", "VERIFICATION", "OUTCOME", "INCIDENT", "RUNBOOK"].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                selectedType === t
                  ? "bg-[#242424] text-white border-[#242424]"
                  : "bg-[#FAFAF8] text-[#6B6B6B] border-[#E8E6E1] hover:text-[#242424]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Memory Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMemories.map((mem) => (
          <div
            key={mem.id}
            className="bg-[#FFFFFF] border border-[#E8E6E1] hover:border-[#8A8A8A] rounded-2xl p-5 space-y-3 shadow-subtle transition-all"
          >
            <div className="flex items-center justify-between border-b border-[#E8E6E1] pb-2">
              <span className="text-xs font-mono text-[#8A8A8A]">{mem.id}</span>
              {getTypeBadge(mem.memory_type)}
            </div>

            <h3 className="font-semibold text-sm text-[#242424]">{mem.title}</h3>
            <p className="text-xs text-[#6B6B6B] leading-relaxed">{mem.content}</p>

            <div className="flex flex-wrap items-center gap-1.5 pt-2 text-[10px]">
              <span className="text-[#8A8A8A]">Keywords:</span>
              {(mem.keywords || []).map((kw: string, i: number) => (
                <span key={i} className="bg-[#FAFAF8] text-[#6B6B6B] border border-[#E8E6E1] px-1.5 py-0.2 rounded">
                  #{kw}
                </span>
              ))}
            </div>

            <div className="text-[10px] text-[#8A8A8A] pt-2 border-t border-[#E8E6E1] flex justify-between">
              <span>Source Incident: {mem.source_incident_id || mem.incident_type}</span>
              <span>Retained: {mem.created_at}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Manual Retain Knowledge Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-elevated">
            <h3 className="font-semibold text-base text-[#242424] border-b border-[#E8E6E1] pb-3 flex items-center gap-2">
              <Brain className="w-5 h-5 text-[#242424]" /> Retain Operational Knowledge in Hindsight
            </h3>

            <form onSubmit={handleRetainNewMemory} className="space-y-3 text-xs">
              <div>
                <label className="text-[#242424] font-medium">Memory Type:</label>
                <select
                  value={memType}
                  onChange={(e) => setMemType(e.target.value)}
                  className="w-full mt-1 bg-[#FAFAF8] border border-[#E8E6E1] rounded-lg p-2 text-[#242424]"
                >
                  <option value="CORRECTION">SRE Human Correction</option>
                  <option value="FAILURE">Failure Memory</option>
                  <option value="VERIFICATION">Verification Lesson</option>
                  <option value="RUNBOOK">Runbook Procedure</option>
                </select>
              </div>

              <div>
                <label className="text-[#242424] font-medium">Incident Scenario Type:</label>
                <select
                  value={incType}
                  onChange={(e) => setIncType(e.target.value)}
                  className="w-full mt-1 bg-[#FAFAF8] border border-[#E8E6E1] rounded-lg p-2 text-[#242424]"
                >
                  <option value="INCIDENT_1_DB_EXHAUSTION">INCIDENT_1_DB_EXHAUSTION</option>
                  <option value="INCIDENT_2_BAD_DEPLOYMENT">INCIDENT_2_BAD_DEPLOYMENT</option>
                  <option value="INCIDENT_3_MEMORY_LEAK">INCIDENT_3_MEMORY_LEAK</option>
                  <option value="INCIDENT_4_DEPENDENCY_FAILURE">INCIDENT_4_DEPENDENCY_FAILURE</option>
                </select>
              </div>

              <div>
                <label className="text-[#242424] font-medium">Title:</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Always recycle pool workers before restarting Payment Service"
                  className="w-full mt-1 bg-[#FAFAF8] border border-[#E8E6E1] rounded-lg p-2 text-[#242424] focus:outline-none focus:border-[#242424]"
                />
              </div>

              <div>
                <label className="text-[#242424] font-medium">Operational Content & Lessons:</label>
                <textarea
                  required
                  rows={3}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Detailed description of what failed or what human correction was verified..."
                  className="w-full mt-1 bg-[#FAFAF8] border border-[#E8E6E1] rounded-lg p-2 text-[#242424] focus:outline-none focus:border-[#242424]"
                />
              </div>

              <div>
                <label className="text-[#242424] font-medium">Comma-separated Keywords:</label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="restart, failed, pool, payment-service, connection_leak"
                  className="w-full mt-1 bg-[#FAFAF8] border border-[#E8E6E1] rounded-lg p-2 text-[#242424] focus:outline-none focus:border-[#242424]"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#E8E6E1]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#FAFAF8] text-[#6B6B6B] border border-[#E8E6E1] font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#242424] text-white font-medium hover:bg-[#3B3B3B]"
                >
                  Save to Hindsight
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
