import React, { useState } from "react";
import { motion } from "motion/react";
import { Shield, Sparkles, FileText, Lock } from "lucide-react";

export default function ZhynorMovableLogo() {
  const [accent, setAccent] = useState<"emerald" | "violet" | "amber" | "cyan">("emerald");

  const cycleAccent = (e: React.MouseEvent) => {
    e.stopPropagation();
    const sequence: ("emerald" | "violet" | "amber" | "cyan")[] = ["emerald", "violet", "amber", "cyan"];
    const currentIndex = sequence.indexOf(accent);
    const nextIndex = (currentIndex + 1) % sequence.length;
    setAccent(sequence[nextIndex]);
  };

  const accentStyles = {
    emerald: {
      border: "border-emerald-500/30 hover:border-emerald-500/60",
      glow: "shadow-emerald-500/10 hover:shadow-emerald-500/20",
      badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      logoBg: "bg-emerald-500",
      text: "text-emerald-400",
      pulse: "bg-emerald-500/20"
    },
    violet: {
      border: "border-violet-500/30 hover:border-violet-500/60",
      glow: "shadow-violet-500/10 hover:shadow-violet-500/20",
      badge: "bg-violet-500/10 text-violet-400 border-violet-500/20",
      logoBg: "bg-violet-500",
      text: "text-violet-400",
      pulse: "bg-violet-500/20"
    },
    amber: {
      border: "border-amber-500/30 hover:border-amber-500/60",
      glow: "shadow-amber-500/10 hover:shadow-amber-500/20",
      badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      logoBg: "bg-amber-500",
      text: "text-amber-400",
      pulse: "bg-amber-500/20"
    },
    cyan: {
      border: "border-cyan-500/30 hover:border-cyan-500/60",
      glow: "shadow-cyan-500/10 hover:shadow-cyan-500/20",
      badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
      logoBg: "bg-cyan-500",
      text: "text-cyan-400",
      pulse: "bg-cyan-500/20"
    }
  };

  return (
    <motion.div
      drag
      dragMomentum={true}
      dragElastic={0.1}
      whileDrag={{ scale: 1.05, cursor: "grabbing" }}
      whileHover={{ y: -2 }}
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3.5 p-3.5 bg-slate-950/90 backdrop-blur-xl border rounded-2xl shadow-2xl cursor-grab select-none w-[290px] transition-all duration-300 ${accentStyles[accent].border} ${accentStyles[accent].glow}`}
    >
      {/* Sleek Interactive Logo Core */}
      <div className="relative w-11 h-11 shrink-0 flex items-center justify-center">
        {/* Glowing Backplane Pulse */}
        <span className={`absolute inset-0 rounded-xl animate-ping opacity-15 duration-1000 ${accentStyles[accent].logoBg}`} />
        
        {/* Double-ring orbital border */}
        <div className={`absolute inset-0 border-2 rounded-xl transition-all duration-300 ${accentStyles[accent].border}`} />
        
        {/* Inner high-contrast emblem */}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-white shadow-md text-base relative overflow-hidden transition-all duration-300 ${accentStyles[accent].logoBg}`}>
          {/* Futuristic linear glow overlay */}
          <span className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 -translate-x-full animate-[shimmer_2.5s_infinite]" />
          Z
        </div>

        {/* Small lock/security mini badge */}
        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center border border-slate-950 text-[8px] font-bold text-white shadow-xs ${accentStyles[accent].logoBg}`}>
          <Lock size={7} />
        </div>
      </div>

      {/* Brand & Typography Metadata */}
      <div className="text-left flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-black tracking-widest text-slate-300">
            Z H Y N O R
          </span>
          <span className={`text-[7px] font-black border px-1 rounded-full uppercase tracking-wider ${accentStyles[accent].badge}`}>
            Secure v2
          </span>
        </div>
        <h4 className="text-xs font-black text-white tracking-tight leading-none mt-1">
          PDF Toolkit
        </h4>
        <p className="text-[8.5px] text-slate-400 font-medium font-sans mt-0.5 leading-normal">
          Powered by <span className={`font-black font-mono tracking-wide ${accentStyles[accent].text}`}>Zhynor Technologies</span>
        </p>
      </div>

      {/* Quick Customize Button */}
      <button
        onClick={cycleAccent}
        title="Cycle Accent Color"
        className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-lg border border-slate-800 transition-colors cursor-pointer shrink-0"
      >
        <Sparkles size={11} className={`transition-all ${accentStyles[accent].text}`} />
      </button>
    </motion.div>
  );
}
