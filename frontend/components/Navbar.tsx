"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  ShieldAlert, 
  Globe, 
  AlertCircle,
  Server, 
  Brain, 
  BookOpen, 
  BarChart3, 
  ScrollText, 
  Play, 
  RotateCcw,
  Menu,
  X,
  Sparkles
} from "lucide-react";
import { fetchSystemStatus, resetDemo } from "@/lib/api";

export default function Navbar() {
  const pathname = usePathname();
  const [status, setStatus] = useState<any>(null);
  const [resetting, setResetting] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchSystemStatus()
      .then(data => setStatus(data))
      .catch(() => setStatus(null));
  }, [pathname]);

  const handleReset = async () => {
    if (confirm("Reset simulator, active incidents, telemetry, and memory to clean operational baseline?")) {
      setResetting(true);
      try {
        await resetDemo();
        window.location.reload();
      } catch (e) {
        console.error(e);
      } finally {
        setResetting(false);
      }
    }
  };


  const navItems = [
    { label: "Overview", href: "/", icon: LayoutDashboard },
    { label: "Website Audit", href: "/website-audit", icon: Globe, badge: "Live Scanner" },
    { label: "Incidents", href: "/incidents", icon: ShieldAlert },
    { label: "Error Center", href: "/errors", icon: AlertCircle },
    { label: "Services", href: "/services", icon: Server },
    { label: "Memory", href: "/hindsight", icon: Brain },
    { label: "Runbooks", href: "/runbooks", icon: BookOpen },
    { label: "Evaluation", href: "/evaluation", icon: BarChart3 },
    { label: "Audit Log", href: "/audit", icon: ScrollText }
  ];


  const isNavActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/incidents") return pathname === "/incidents" || pathname.startsWith("/incidents/");
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-[#FFFFFF] border-b border-[#E8E6E1] px-4 sm:px-6 lg:px-8 py-3 transition-colors">
        <div className="flex items-center justify-between">
          
          {/* Brand / Logo */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 text-[#6B6B6B] hover:text-[#242424] hover:bg-[#F4F3EE] rounded-lg"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-[#242424] text-white flex items-center justify-center font-bold text-sm shadow-sm group-hover:bg-[#3B3B3B] transition-colors">
                <Brain className="w-4 h-4 text-[#FAFAF8]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm tracking-tight text-[#242424]">
                    Incident Intelligence
                  </span>
                  <span className="hidden sm:inline-block text-[11px] font-medium text-[#6B6B6B] bg-[#F4F3EE] border border-[#E8E6E1] px-1.5 py-0.2 rounded">
                    SRE Agent
                  </span>
                </div>
              </div>
            </Link>
          </div>

          {/* Right Status Indicator & Reset Button */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-[#6B6B6B]">
              <span className="flex items-center gap-1.5 bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0] px-2.5 py-1 rounded-full text-[11px]">
                <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse"></span>
                System ● Online
              </span>
              <span className="hidden lg:flex items-center gap-1 text-[#6B6B6B] bg-[#F4F3EE] border border-[#E8E6E1] px-2.5 py-1 rounded-full text-[11px]">
                <Sparkles className="w-3 h-3 text-[#D97706]" />
                Hindsight Memory Active
              </span>
            </div>

            <button
              onClick={handleReset}
              disabled={resetting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#6B6B6B] hover:text-[#242424] bg-[#F4F3EE] hover:bg-[#EFECE6] border border-[#E8E6E1] transition-all"
              title="Reset simulator, active incidents, telemetry, and memory back to clean state"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${resetting ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{resetting ? "Resetting..." : "Reset Demo"}</span>
            </button>
          </div>

        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#FFFFFF] border-b border-[#E8E6E1] px-4 py-3 space-y-1 shadow-sm">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isNavActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  active 
                    ? "bg-[#F4F3EE] text-[#242424] font-semibold" 
                    : "text-[#6B6B6B] hover:bg-[#FAFAF8] hover:text-[#242424]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] px-1.5 py-0.5 rounded font-medium">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
