import { Target, Brain, Shield, Search, Pencil } from "lucide-react";

type AgentHealth = "HEALTHY" | "DEGRADED" | "CRITICAL";

type StrategicIntelProps = {
  agentHealth: {
    agentManager: AgentHealth;
    ironsight: AgentHealth;
    coreintel: AgentHealth;
  };
  phoneHomeAlert: string | null;
  coreintelLiveFeed: string[];
};

const HEALTH_TEXT_STYLE: Record<AgentHealth, string> = {
  HEALTHY: "text-emerald-400",
  DEGRADED: "text-amber-400",
  CRITICAL: "text-red-400",
};

const HEALTH_DOT_STYLE: Record<AgentHealth, string> = {
  HEALTHY: "bg-emerald-500",
  DEGRADED: "bg-amber-400",
  CRITICAL: "bg-red-500",
};

export default function StrategicIntel({
  agentHealth,
  phoneHomeAlert,
  coreintelLiveFeed,
}: StrategicIntelProps) {
  return (
    <div className="flex flex-col gap-4 text-slate-200 bg-slate-950 p-4 h-full font-sans border-r border-slate-800">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold tracking-wider uppercase">STRATEGIC INTEL</span>
          <Pencil className="w-3 h-3 text-slate-500" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-[9px] font-bold ${HEALTH_TEXT_STYLE[agentHealth.agentManager]}`}>
            AGENT MANAGER: {agentHealth.agentManager}
          </span>
          <div className={`w-1.5 h-1.5 rounded-full ${HEALTH_DOT_STYLE[agentHealth.agentManager]} animate-pulse`} />
        </div>
      </div>

      {phoneHomeAlert && (
        <div className="rounded border border-red-500/70 bg-red-500/15 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-red-300">
          {phoneHomeAlert}
          <a href="mailto:support@ironframe.local" className="ml-2 underline text-red-200">
            Contact Support
          </a>
        </div>
      )}

      {/* Industry Profile */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase">INDUSTRY PROFILE</span>
          <span className="text-[9px] text-blue-400 cursor-pointer hover:underline">Hide</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-2 rounded text-[11px] text-slate-300">
          Healthcare
        </div>
        <button className="w-full bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold py-1.5 rounded transition-colors shadow-sm">
          Load Strategy
        </button>
      </div>

      {/* Risk Exposure */}
      <div className="flex flex-col gap-3">
        <span className="text-[10px] font-bold text-slate-400 uppercase">RISK EXPOSURE</span>
        
        <div className="space-y-2">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] font-bold uppercase">
              <span className="text-slate-400">INDUSTRY AVERAGE</span>
              <span className="text-blue-400">$8.5M</span>
            </div>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 w-[55%]"></div>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] font-bold uppercase">
              <span className="text-slate-400">YOUR CURRENT RISK</span>
              <span className="text-yellow-500">$10.9M</span>
            </div>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-500 w-[70%]"></div>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] font-bold uppercase">
              <span className="text-slate-400">POTENTIAL IMPACT</span>
              <span className="text-red-500">$15.2M</span>
            </div>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-red-500 w-[85%]"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Sector Threats */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase">TOP SECTOR THREATS (CLICK TO REGISTER)</span>
        <div className="space-y-1.5">
          {["RANSOMWARE", "DATA BREACH", "PHISHING ATTACK"].map((threat, i) => (
            <div key={threat} className="flex justify-between items-center bg-slate-900/50 border border-slate-800 px-3 py-2 rounded cursor-pointer hover:bg-slate-800 transition-colors">
              <span className="text-[10px] font-bold">{threat}</span>
              <span className="text-[10px] font-bold text-emerald-400">
                ${i === 0 ? "4.9M" : i === 1 ? "3.5M" : "2.1M"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* AI Agents */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase">AI AGENTS</span>
        <div className="grid grid-cols-3 gap-2">
          {[
            { name: "IRONSIGHT", icon: Target, color: "text-red-500", health: agentHealth.ironsight },
            { name: "COREINTEL", icon: Brain, color: "text-pink-400", health: agentHealth.coreintel },
            { name: "AGENT MANAGER", icon: Shield, color: "text-slate-300", health: agentHealth.agentManager }
          ].map((agent) => (
            <div key={agent.name} className="flex flex-col items-center gap-1.5 bg-slate-900/50 border border-slate-800 p-2 rounded">
              <agent.icon className={`w-4 h-4 ${agent.color}`} />
              <span className="text-[8px] font-bold text-slate-400">{agent.name}</span>
              <div className="flex items-center gap-1">
                <div className={`w-1 h-1 rounded-full ${HEALTH_DOT_STYLE[agent.health]}`} />
                <span className={`text-[7px] font-bold uppercase ${HEALTH_TEXT_STYLE[agent.health]}`}>{agent.health}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase">COREINTEL // LIVE INTELLIGENCE STREAM</span>
        <div className="max-h-24 overflow-y-auto rounded border border-slate-800 bg-black/50 p-2 font-mono text-[9px] text-cyan-200">
          {coreintelLiveFeed.map((line, index) => (
            <p key={`${line}-${index}`} className="whitespace-nowrap">
              {line}
            </p>
          ))}
        </div>
      </div>

      {/* Sentinel Sweep Action */}
      <div className="mt-auto pt-4 space-y-2">
         <div className="grid grid-cols-3 gap-2">
           <div className="flex items-center justify-center rounded border border-slate-800 bg-slate-900 px-2 py-1.5">
             <div className="h-1.5 w-1.5 rounded-full bg-slate-500" />
           </div>
           <button className="rounded bg-blue-600 px-2 py-1.5 text-[10px] font-bold uppercase text-white hover:bg-blue-500">
             SET
           </button>
           <div className="flex items-center justify-center rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-[10px] font-bold text-amber-300">
             TTL: 00:00:00
           </div>
         </div>

         <div className="space-y-1">
           <label className="text-[10px] font-semibold text-slate-400">Enter Agent Instruction...</label>
           <input
             type="text"
             className="w-full rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-[10px] text-slate-200 outline-none placeholder:text-slate-500"
             placeholder="Enter Agent Instruction..."
           />
         </div>

         <button className="w-full bg-amber-400 hover:bg-amber-300 text-slate-900 font-extrabold text-[11px] py-3 rounded flex items-center justify-center gap-2 transition-colors shadow-lg uppercase">
           <Search className="w-4 h-4" />
           Run Sentinel Sweep
         </button>
      </div>
    </div>
  );
}