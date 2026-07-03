"use client";

import { useState } from "react";

import { useTenantContext } from "@/app/context/TenantProvider";

interface ChatMessage {
  id: string;
  sender: "USER" | "SYSTEM_AGENT";
  text: string;
  timestamp: string;
}

export default function AuthenticatedSupportConsole() {
  const { tenantFetch } = useTenantContext();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg_init_01",
      sender: "SYSTEM_AGENT",
      text: "Secure support session established. Standing by to resolve infrastructure, GRC workflow, or platform integration anomalies using verified Level 1 compliance manuals.",
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [inputVal, setInputVal] = useState("");
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || isSynthesizing) return;

    const userMessage: ChatMessage = {
      id: `msg_usr_${Date.now()}`,
      sender: "USER",
      text: inputVal.trim(),
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputVal("");
    setIsSynthesizing(true);

    try {
      const response = await tenantFetch("/api/agents/customer-service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.text }),
      });

      const data = (await response.json()) as { reply?: string; error?: string };

      setMessages((prev) => [
        ...prev,
        {
          id: `msg_agt_${Date.now()}`,
          sender: "SYSTEM_AGENT",
          text:
            data.reply ||
            data.error ||
            "An internal timeout occurred. A platform administrator has been alerted.",
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } catch (err) {
      console.error("Agent execution failure:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_err_${Date.now()}`,
          sender: "SYSTEM_AGENT",
          text: "Core connection boundary disrupted. Failed to reach agent cluster router.",
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsSynthesizing(false);
    }
  };

  return (
    <div className="relative flex min-h-[calc(100vh-5rem)] flex-col justify-between overflow-hidden bg-[#020617] p-4 text-slate-100 sm:p-6">
      <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col space-y-4">
        <header className="flex flex-col justify-between gap-3 border-b border-slate-800/80 pb-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-0.5 flex items-center gap-2 font-mono text-[10px] tracking-widest text-indigo-400 uppercase">
              <span>SECURED OPERATOR PLANE</span>
              <span>·</span>
              <span className="text-cyan-400">SESSION_ACTIVE</span>
            </div>
            <h1 className="font-sans text-xl font-bold tracking-tight text-white">
              AI Support & Diagnostics Console
            </h1>
          </div>
          <div className="flex items-center gap-4 rounded-lg border border-slate-800/60 bg-slate-950/40 px-3 py-1.5 font-mono text-xs text-slate-500">
            <span className="flex h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            <span>GROUNDING: LEVEL_1 MANUALS</span>
          </div>
        </header>

        <div className="flex min-h-[400px] flex-1 flex-col justify-end overflow-y-auto rounded-xl border border-slate-800/80 bg-[#070e20]/30 p-4 backdrop-blur-md">
          <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex max-w-[85%] flex-col ${msg.sender === "USER" ? "ml-auto items-end" : "mr-auto items-start"}`}
              >
                <div className="mb-1 px-1 font-mono text-[10px] text-slate-500 uppercase">
                  {msg.sender === "USER" ? "Verified Operator" : "Customer Service Agent"} ·{" "}
                  {msg.timestamp}
                </div>
                <div
                  className={`rounded-xl p-3.5 font-sans text-sm leading-relaxed shadow-md ${
                    msg.sender === "USER"
                      ? "border border-indigo-500/20 bg-indigo-600/90 text-white"
                      : "border border-slate-800 bg-slate-900/80 text-slate-200"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {isSynthesizing ? (
              <div className="mr-auto max-w-[85%] animate-pulse items-start">
                <div className="mb-1 px-1 font-mono text-[10px] text-cyan-500 uppercase">
                  Agent processing
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/40 p-3.5 font-mono text-sm text-slate-400">
                  <span className="inline-block h-4 w-1.5 animate-bounce bg-cyan-400" />
                  <span>Parsing structural knowledge graphs...</span>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Query platform settings, workflow errors, or integration boundaries..."
              className="h-11 w-full touch-manipulation rounded-lg border border-slate-800 bg-slate-950/60 px-4 font-sans text-sm text-white transition-all duration-150 outline-none placeholder:text-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
          </div>
          <button
            type="submit"
            disabled={!inputVal.trim() || isSynthesizing}
            className="h-11 shrink-0 touch-manipulation rounded-lg bg-cyan-600 px-6 font-sans text-sm font-bold tracking-wide text-slate-950 uppercase transition-all duration-150 hover:bg-cyan-500 active:scale-[0.98] disabled:bg-slate-900 disabled:text-slate-600"
          >
            Execute
          </button>
        </form>
      </div>
    </div>
  );
}
