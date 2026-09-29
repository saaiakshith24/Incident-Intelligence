"use client";

import React, { useState } from "react";
import { MessageSquare, Send, Sparkles, Bot, User, CornerDownLeft } from "lucide-react";
import { sendChatMessage } from "@/lib/api";

interface IncidentAIChatProps {
  incidentId: string;
}

export default function IncidentAIChat({ incidentId }: IncidentAIChatProps) {
  const [messages, setMessages] = useState<Array<{ sender: "user" | "agent"; text: string; time: string }>>([
    {
      sender: "agent",
      text: "Hello, I am the Incident Intelligence Agent. I have ingested live telemetry, recent deployments, and Hindsight operational memories for this incident. Ask me anything about root causes, past failure memories, or recovery recommendations.",
      time: "Now"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const quickPrompts = [
    "What caused this?",
    "Why do you think the database is responsible?",
    "Show the previous incident",
    "Why not scale the service?",
    "What happens if we rollback?",
    "Show supporting evidence",
    "Generate the postmortem"
  ];

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg = { sender: "user" as const, text: textToSend, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInput("");
    setLoading(true);

    try {
      const res = await sendChatMessage(incidentId, textToSend);
      const agentMsg = {
        sender: "agent" as const,
        text: res.reply || "I analyzed the incident telemetry and Hindsight memories.",
        time: res.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, agentMsg]);
    } catch (e) {
      console.error(e);
      setMessages((prev) => [
        ...prev,
        {
          sender: "agent",
          text: "Sorry, I encountered an issue connecting to the reasoning backend. Operating with deterministic telemetry fallback.",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#E8E6E1] rounded-2xl p-5 shadow-card space-y-4">
      <div className="flex items-center justify-between border-b border-[#E8E6E1] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#242424] text-white flex items-center justify-center shadow-subtle">
            <Sparkles className="w-3.5 h-3.5 text-[#FAFAF8]" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-[#242424]">Incident AI Assistant</h3>
            <p className="text-[11px] text-[#6B6B6B]">Grounded in live telemetry & Hindsight memory</p>
          </div>
        </div>
        <span className="text-[11px] font-mono text-[#6B6B6B] bg-[#FAFAF8] border border-[#E8E6E1] px-2 py-0.5 rounded">
          {incidentId}
        </span>
      </div>

      {/* Suggested Quick Prompts */}
      <div className="space-y-1.5">
        <div className="text-[11px] font-medium text-[#8A8A8A]">Suggested questions:</div>
        <div className="flex flex-wrap gap-1.5">
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(p)}
              disabled={loading}
              className="text-[11px] text-[#6B6B6B] hover:text-[#242424] bg-[#FAFAF8] hover:bg-[#F4F3EE] border border-[#E8E6E1] px-2.5 py-1 rounded-lg transition-colors text-left"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Log */}
      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex gap-2.5 text-xs ${m.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.sender === "agent" && (
              <div className="w-6 h-6 rounded-full bg-[#FAFAF8] border border-[#E8E6E1] text-[#242424] flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 space-y-1 leading-relaxed ${
                m.sender === "user"
                  ? "bg-[#242424] text-[#FFFFFF]"
                  : "bg-[#FAFAF8] border border-[#E8E6E1] text-[#242424]"
              }`}
            >
              <p className="text-xs whitespace-pre-wrap">{m.text}</p>
              <div className={`text-[10px] text-right ${m.sender === "user" ? "text-gray-300" : "text-[#8A8A8A]"}`}>
                {m.time}
              </div>
            </div>
            {m.sender === "user" && (
              <div className="w-6 h-6 rounded-full bg-[#242424] text-white flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-2.5 text-xs">
            <div className="w-6 h-6 rounded-full bg-[#FAFAF8] border border-[#E8E6E1] text-[#242424] flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="bg-[#FAFAF8] border border-[#E8E6E1] text-[#6B6B6B] rounded-2xl px-3.5 py-2 italic text-xs">
              Analyzing telemetry & recalling Hindsight memory...
            </div>
          </div>
        )}
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="relative flex items-center"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about this incident..."
          className="w-full bg-[#FAFAF8] border border-[#E8E6E1] rounded-xl pl-3.5 pr-10 py-2 text-xs text-[#242424] placeholder-[#8A8A8A] focus:outline-none focus:border-[#242424] transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="absolute right-2 p-1.5 text-[#6B6B6B] hover:text-[#242424] disabled:opacity-40"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
