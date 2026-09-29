"use client";

import React from "react";
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
  CheckCircle2,
  Sparkles
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { label: "Overview", href: "/", icon: LayoutDashboard },
    { label: "Website Audit", href: "/website-audit", icon: Globe, badge: "Live" },
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
    <aside className="hidden md:flex flex-col w-56 shrink-0 bg-[#FFFFFF] border-r border-[#E8E6E1] min-h-[calc(100vh-57px)] p-3 justify-between">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wider">
          Workspace
        </div>

        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isNavActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  active
                    ? "bg-[#F4F3EE] text-[#242424] font-semibold shadow-subtle"
                    : "text-[#6B6B6B] hover:bg-[#FAFAF8] hover:text-[#242424]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${active ? "text-[#242424]" : "text-[#8A8A8A]"}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] px-1.5 py-0.2 rounded font-medium">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Status Card in Sidebar */}
      <div className="pt-4 border-t border-[#E8E6E1] space-y-2">
        <div className="p-3 bg-[#FAFAF8] border border-[#E8E6E1] rounded-xl space-y-1.5 text-xs">
          <div className="flex items-center gap-1.5 text-[#166534] font-semibold text-[11px]">
            <span className="w-2 h-2 rounded-full bg-[#16A34A]"></span>
            <span>Hindsight Active</span>
          </div>
          <p className="text-[11px] text-[#8A8A8A] leading-relaxed">
            Retaining operational failures and SRE corrections.
          </p>
        </div>
      </div>
    </aside>
  );
}
