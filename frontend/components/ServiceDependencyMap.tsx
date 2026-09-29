"use client";

import React from "react";
import { Server, Database, Cpu, Layers, AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";

interface ServiceProps {
  services: any[];
  onSelectService?: (service: any) => void;
  selectedServiceId?: string;
}

export default function ServiceDependencyMap({ services, onSelectService, selectedServiceId }: ServiceProps) {
  const getService = (id: string) => services.find(s => s.id === id) || {};

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

  const RenderNode = ({ id, label, icon: Icon, extraMetrics }: { id: string; label: string; icon: any; extraMetrics?: string }) => {
    const s = getService(id);
    const isSelected = selectedServiceId === id;
    const isCritical = s.status === "CRITICAL";
    const isDegraded = s.status === "DEGRADED";

    return (
      <div
        onClick={() => onSelectService && onSelectService(s)}
        className={`p-3.5 rounded-xl border transition-all cursor-pointer bg-[#FFFFFF] shadow-subtle ${
          isCritical 
            ? "border-[#FECACA] bg-[#FFFBFB]" 
            : isDegraded 
            ? "border-[#FDE68A] bg-[#FFFDF7]" 
            : "border-[#E8E6E1] hover:border-[#242424]"
        } ${isSelected ? "ring-2 ring-[#242424]" : ""}`}
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${isCritical ? "bg-[#FEF2F2] text-[#DC2626]" : "bg-[#FAFAF8] text-[#242424]"}`}>
              <Icon className="w-4 h-4" />
            </div>
            <span className="font-semibold text-xs text-[#242424]">{label}</span>
          </div>
          {getStatusBadge(s.status || "HEALTHY")}
        </div>

        <div className="text-[11px] grid grid-cols-2 gap-x-2 gap-y-1 text-[#6B6B6B] border-t border-[#E8E6E1]/60 pt-2">
          <div>Errors: <span className={s.error_rate > 5 ? "text-[#DC2626] font-semibold" : "text-[#242424]"}>{s.error_rate || 0}%</span></div>
          <div>P95: <span className={s.latency_p95 > 1000 ? "text-[#DC2626] font-semibold" : "text-[#242424]"}>{s.latency_p95 || 0}ms</span></div>
          {s.db_connections !== undefined && s.db_connections > 0 && (
            <div className="col-span-2 text-[#242424] font-medium pt-0.5">
              DB Pool: <span className={s.db_connections > 80 ? "text-[#DC2626] font-bold" : ""}>{s.db_connections}/100 ({s.connection_pool_usage}%)</span>
            </div>
          )}
          {extraMetrics && <div className="col-span-2 text-[#D97706] text-[10px]">{extraMetrics}</div>}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-5 shadow-card">
      <div className="flex items-center justify-between mb-4 border-b border-[#E8E6E1] pb-3">
        <div>
          <h3 className="font-semibold text-sm text-[#242424] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#242424]" />
            Service Topology & Telemetry
          </h3>
          <p className="text-[11px] text-[#6B6B6B]">Live simulated microservice environment</p>
        </div>
        <span className="text-[11px] text-[#6B6B6B] bg-[#FAFAF8] border border-[#E8E6E1] px-2 py-0.5 rounded-full font-medium">
          8 Services Active
        </span>
      </div>

      {/* Visual Dependency Tree */}
      <div className="space-y-3">
        {/* Tier 1: API Gateway */}
        <div className="max-w-xs mx-auto">
          <RenderNode id="api-gateway" label="API Gateway" icon={Server} />
        </div>

        {/* Connector */}
        <div className="flex justify-center">
          <div className="w-px h-3 bg-[#E8E6E1]"></div>
        </div>

        {/* Tier 2: Core Microservices */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <RenderNode id="user-service" label="User Service" icon={Cpu} />
          <RenderNode id="order-service" label="Order Service" icon={Cpu} />
          <RenderNode id="payment-service" label="Payment Service" icon={Cpu} />
        </div>

        {/* Connector */}
        <div className="flex justify-center">
          <div className="w-px h-3 bg-[#E8E6E1]"></div>
        </div>

        {/* Tier 3: Support Services & Cache */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <RenderNode id="inventory-service" label="Inventory Service" icon={Cpu} />
          <RenderNode id="notification-service" label="Notification Service" icon={Cpu} />
          <RenderNode id="redis-cache" label="Redis Cache Cluster" icon={Database} />
        </div>

        {/* Connector to DB */}
        <div className="flex justify-center">
          <div className="w-px h-3 bg-[#E8E6E1]"></div>
        </div>

        {/* Tier 4: Primary DB */}
        <div className="max-w-xs mx-auto">
          <RenderNode id="postgres-db" label="Primary PostgreSQL" icon={Database} />
        </div>
      </div>
    </div>
  );
}
