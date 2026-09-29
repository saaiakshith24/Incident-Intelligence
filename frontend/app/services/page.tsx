"use client";

import React, { useState, useEffect } from "react";
import { Server, Database, Cpu, RefreshCw, AlertCircle, CheckCircle2, ShieldAlert, GitCommit, Layers } from "lucide-react";
import { fetchServices } from "@/lib/api";

export default function ServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<any>(null);

  const loadServices = async () => {
    setLoading(true);
    try {
      const data = await fetchServices();
      setServices(data);
      if (data.length > 0 && !selectedService) {
        setSelectedService(data[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CRITICAL":
        return <span className="bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA] text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1"><AlertCircle className="w-2.5 h-2.5" /> Critical</span>;
      case "DEGRADED":
        return <span className="bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1"><ShieldAlert className="w-2.5 h-2.5" /> Degraded</span>;
      default:
        return <span className="bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0] text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5" /> Healthy</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-6 shadow-card">
        <div>
          <h1 className="text-xl font-semibold text-[#242424]">Microservice Infrastructure</h1>
          <p className="text-xs text-[#6B6B6B]">Live topology, runtime telemetry, resource consumption, and dependencies</p>
        </div>

        <button
          onClick={loadServices}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FAFAF8] hover:bg-[#F4F3EE] border border-[#E8E6E1] text-[#242424] rounded-lg text-xs font-medium transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Grid of 8 Services (Spec 31) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {services.map((svc) => {
          const isSelected = selectedService?.id === svc.id;
          const isCritical = svc.status === "CRITICAL";

          return (
            <div
              key={svc.id}
              onClick={() => setSelectedService(svc)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer bg-[#FFFFFF] shadow-subtle ${
                isCritical
                  ? "border-[#FECACA] bg-[#FFFBFB]"
                  : "border-[#E8E6E1] hover:border-[#242424]"
              } ${isSelected ? "ring-2 ring-[#242424]" : ""}`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#FAFAF8] text-[#242424]">
                    {svc.type === "database" || svc.type === "cache" ? <Database className="w-4 h-4" /> : <Server className="w-4 h-4" />}
                  </div>
                  <span className="font-semibold text-xs text-[#242424]">{svc.name}</span>
                </div>
                {getStatusBadge(svc.status)}
              </div>

              <div className="text-xs space-y-1.5 pt-2 border-t border-[#E8E6E1]/60 text-[#6B6B6B]">
                <div className="flex justify-between">
                  <span>Version:</span>
                  <strong className="text-[#242424]">{svc.version || "v1.0"}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Error Rate:</span>
                  <strong className={svc.error_rate > 5 ? "text-[#DC2626]" : "text-[#242424]"}>{svc.error_rate || 0}%</strong>
                </div>
                <div className="flex justify-between">
                  <span>P95 Latency:</span>
                  <strong className={svc.latency_p95 > 1000 ? "text-[#DC2626]" : "text-[#242424]"}>{svc.latency_p95 || 0}ms</strong>
                </div>
                <div className="flex justify-between">
                  <span>CPU / Mem:</span>
                  <strong className="text-[#242424]">{svc.cpu_usage || 20}% / {svc.memory_usage || 35}%</strong>
                </div>
                {svc.db_connections !== undefined && (
                  <div className="flex justify-between text-[#242424] font-medium pt-1 border-t border-[#E8E6E1]/40">
                    <span>DB Pool:</span>
                    <strong className={svc.db_connections > 80 ? "text-[#DC2626]" : ""}>{svc.db_connections}/100</strong>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Service Detailed View */}
      {selectedService && (
        <div className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-[#E8E6E1] pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#FAFAF8] text-[#242424]">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-base text-[#242424]">{selectedService.name}</h3>
                <p className="text-xs text-[#6B6B6B]">Service ID: {selectedService.id}</p>
              </div>
            </div>
            {getStatusBadge(selectedService.status)}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-[#FAFAF8] rounded-xl border border-[#E8E6E1]">
              <span className="text-[#8A8A8A]">Deployment Version</span>
              <div className="font-semibold text-[#242424] text-sm mt-1">{selectedService.version}</div>
            </div>
            <div className="p-3 bg-[#FAFAF8] rounded-xl border border-[#E8E6E1]">
              <span className="text-[#8A8A8A]">Error Rate</span>
              <div className="font-semibold text-[#242424] text-sm mt-1">{selectedService.error_rate}%</div>
            </div>
            <div className="p-3 bg-[#FAFAF8] rounded-xl border border-[#E8E6E1]">
              <span className="text-[#8A8A8A]">P95 Latency</span>
              <div className="font-semibold text-[#242424] text-sm mt-1">{selectedService.latency_p95}ms</div>
            </div>
            <div className="p-3 bg-[#FAFAF8] rounded-xl border border-[#E8E6E1]">
              <span className="text-[#8A8A8A]">Request Throughput</span>
              <div className="font-semibold text-[#242424] text-sm mt-1">{selectedService.request_rate} req/s</div>
            </div>
          </div>

          {/* Dependencies and Connected Incidents */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
            <div className="p-4 bg-[#FAFAF8] rounded-xl border border-[#E8E6E1] space-y-2">
              <span className="font-semibold text-[#242424] flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#6B6B6B]" /> Downstream Dependencies
              </span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(selectedService.dependencies || []).length > 0 ? (
                  selectedService.dependencies.map((dep: string) => (
                    <span key={dep} className="px-2.5 py-1 bg-[#FFFFFF] border border-[#E8E6E1] rounded-lg text-[#242424] font-medium">
                      {dep}
                    </span>
                  ))
                ) : (
                  <span className="text-[#8A8A8A] italic">No direct downstream dependencies</span>
                )}
              </div>
            </div>

            <div className="p-4 bg-[#FAFAF8] rounded-xl border border-[#E8E6E1] space-y-2">
              <span className="font-semibold text-[#242424] flex items-center gap-1.5">
                <GitCommit className="w-4 h-4 text-[#6B6B6B]" /> Recent Deployments & Incidents
              </span>
              <div className="space-y-1 text-[#6B6B6B]">
                <div>• Current deployment: <strong>{selectedService.version}</strong></div>
                <div>• Linked scenario: <strong>{selectedService.id === 'payment-service' ? 'INCIDENT_1_DB_EXHAUSTION' : 'Normal Operation'}</strong></div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
