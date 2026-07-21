import React, { useState, useEffect } from "react";
import {
  Folder,
  FileText,
  Clock,
  Settings,
  Shield,
  HelpCircle,
  Menu,
  ChevronRight,
  Sparkles,
  Layers,
  Edit,
  RefreshCw,
  Zap,
  Lock,
  Signature,
  Brain,
  Info,
  ExternalLink,
  Trash2,
  Heart,
  Activity
} from "lucide-react";
import { RecentFile } from "./types";
import { getRecentFiles, toggleFavoriteFile, clearRecentFiles, formatBytes } from "./utils";
import { motion } from "motion/react";

// Import core modules
import OrganizePDF from "./components/OrganizePDF";
import EditPDF from "./components/EditPDF";
import ConvertPDF from "./components/ConvertPDF";
import OptimizePDF from "./components/OptimizePDF";
import SecurityPDF from "./components/SecurityPDF";
import SignFillPDF from "./components/SignFillPDF";
import SmartAIPDF from "./components/SmartAIPDF";
import ZhynorMovableLogo from "./components/ZhynorMovableLogo";

type TabID = "dashboard" | "organize" | "edit" | "convert" | "optimize" | "security" | "sign-fill" | "smart-ai";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabID>("dashboard");
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sync recent files list on mount & when active tab changes (to pick up changes from tools)
  const refreshRecentFiles = () => {
    setRecentFiles(getRecentFiles());
  };

  useEffect(() => {
    refreshRecentFiles();
  }, [activeTab]);

  const handleToggleFavorite = (id: string) => {
    const updated = toggleFavoriteFile(id);
    setRecentFiles(updated);
  };

  const handleClearHistory = () => {
    if (confirm("Are you sure you want to clear your local file activity history? This cannot be undone.")) {
      clearRecentFiles();
      setRecentFiles([]);
    }
  };

  const navigateTo = (tab: TabID) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] font-sans antialiased flex flex-col md:flex-row">
      
      {/* SIDEBAR FOR DESKTOP */}
      <aside className="hidden md:flex md:w-64 bg-slate-900 text-white flex-col border-r border-slate-800 shrink-0 select-none">
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center font-bold text-white shadow-md shadow-emerald-500/20 font-display">
              Z
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight font-display">Zhynor PDF</h1>
              <p className="text-[10px] text-emerald-400 font-semibold font-mono tracking-wider">TOOLKIT • FREE</p>
            </div>
          </div>
        </div>

        {/* Navigation Categories */}
        <nav className="flex-1 px-4 py-6 space-y-7 overflow-y-auto text-left">
          
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 block mb-2">Core Tools</span>
            
            <button
              onClick={() => navigateTo("dashboard")}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${activeTab === "dashboard" ? "bg-emerald-600 text-white font-bold" : "text-slate-400 hover:text-white hover:bg-slate-800/40"}`}
            >
              <div className="flex items-center gap-2.5">
                <Layers size={14} />
                <span>Executive Dashboard</span>
              </div>
            </button>

            <button
              onClick={() => navigateTo("organize")}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${activeTab === "organize" ? "bg-emerald-600 text-white font-bold" : "text-slate-400 hover:text-white hover:bg-slate-800/40"}`}
            >
              <div className="flex items-center gap-2.5">
                <Folder size={14} />
                <span>Organize & Merge</span>
              </div>
            </button>

            <button
              onClick={() => navigateTo("edit")}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${activeTab === "edit" ? "bg-emerald-600 text-white font-bold" : "text-slate-400 hover:text-white hover:bg-slate-800/40"}`}
            >
              <div className="flex items-center gap-2.5">
                <Edit size={14} />
                <span>Visual Canvas Editor</span>
              </div>
            </button>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 block mb-2">Conversions</span>
            
            <button
              onClick={() => navigateTo("convert")}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${activeTab === "convert" ? "bg-emerald-600 text-white font-bold" : "text-slate-400 hover:text-white hover:bg-slate-800/40"}`}
            >
              <div className="flex items-center gap-2.5">
                <RefreshCw size={14} />
                <span>File Converter</span>
              </div>
            </button>

            <button
              onClick={() => navigateTo("optimize")}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${activeTab === "optimize" ? "bg-emerald-600 text-white font-bold" : "text-slate-400 hover:text-white hover:bg-slate-800/40"}`}
            >
              <div className="flex items-center gap-2.5">
                <Zap size={14} />
                <span>Compressor & Meta</span>
              </div>
            </button>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 block mb-2">Security & Signatures</span>
            
            <button
              onClick={() => navigateTo("security")}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${activeTab === "security" ? "bg-emerald-600 text-white font-bold" : "text-slate-400 hover:text-white hover:bg-slate-800/40"}`}
            >
              <div className="flex items-center gap-2.5">
                <Lock size={14} />
                <span>Watermarks & Locks</span>
              </div>
            </button>

            <button
              onClick={() => navigateTo("sign-fill")}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${activeTab === "sign-fill" ? "bg-emerald-600 text-white font-bold" : "text-slate-400 hover:text-white hover:bg-slate-800/40"}`}
            >
              <div className="flex items-center gap-2.5">
                <Signature size={14} />
                <span>Signatures & Forms</span>
              </div>
            </button>
          </div>          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 block mb-2">Smart Tools</span>
            
            <button
              onClick={() => navigateTo("smart-ai")}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${activeTab === "smart-ai" ? "bg-emerald-600 text-white font-bold" : "text-slate-400 hover:text-white hover:bg-slate-800/40"}`}
            >
              <div className="flex items-center gap-2.5">
                <Brain size={14} />
                <span>Smart Scan & OCR</span>
              </div>
              <span className="text-[8px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">SECURE</span>
            </button>
          </div>
        </nav>

        {/* Security / Privacy Trust Badge */}
        <div className="p-4 mx-4 mb-2 bg-slate-800/50 rounded-2xl border border-slate-800 text-left">
          <div className="flex items-start gap-2.5">
            <Shield className="text-emerald-400 shrink-0 mt-0.5" size={14} />
            <div>
              <p className="text-[10px] font-bold text-slate-200">Zhynor Technologies</p>
              <p className="text-[9px] text-slate-400 mt-0.5 leading-normal">
                Building privacy-first software, AI-powered applications, automation platforms, and business solutions for modern teams.
              </p>
            </div>
          </div>
        </div>

        {/* Support & Brand Box */}
        <div className="p-4 mx-4 mb-4 bg-slate-950/40 rounded-2xl border border-slate-800/60 text-left space-y-1.5">
          <p className="text-[10px] font-bold text-slate-300">Engineering Support</p>
          <p className="text-[9px] text-slate-400 leading-normal">
            Professional support for Zhynor PDF Toolkit users.
          </p>
          <a href="mailto:zhynor.business@gmail.com" className="text-[9px] text-emerald-400 hover:underline font-semibold block break-all">
            zhynor.business@gmail.com
          </a>
        </div>
      </aside>

      {/* MOBILE HEADER & MENU */}
      <div className="md:hidden w-full bg-slate-900 text-white px-4 py-3 flex justify-between items-center select-none border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-emerald-500 rounded flex items-center justify-center font-bold text-white shadow-md">
            Z
          </div>
          <div>
            <h1 className="font-bold text-xs tracking-tight">Zhynor PDF</h1>
            <p className="text-[8px] text-emerald-400 font-mono">100% FREE</p>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 hover:bg-slate-800 rounded-lg"
        >
          <Menu size={18} />
        </button>
      </div>

      {/* MOBILE NAVIGATION MENU */}
      {mobileMenuOpen && (
        <div className="md:hidden w-full bg-slate-900 border-b border-slate-800 text-white text-left p-4 space-y-3 z-50">
          <button onClick={() => navigateTo("dashboard")} className="w-full text-xs font-semibold py-2 px-3 hover:bg-slate-800 rounded-lg block">Dashboard</button>
          <button onClick={() => navigateTo("organize")} className="w-full text-xs font-semibold py-2 px-3 hover:bg-slate-800 rounded-lg block">Organize & Merge</button>
          <button onClick={() => navigateTo("edit")} className="w-full text-xs font-semibold py-2 px-3 hover:bg-slate-800 rounded-lg block">Visual Canvas Editor</button>
          <button onClick={() => navigateTo("convert")} className="w-full text-xs font-semibold py-2 px-3 hover:bg-slate-800 rounded-lg block">File Converter</button>
          <button onClick={() => navigateTo("optimize")} className="w-full text-xs font-semibold py-2 px-3 hover:bg-slate-800 rounded-lg block">Compressor & Meta</button>
          <button onClick={() => navigateTo("security")} className="w-full text-xs font-semibold py-2 px-3 hover:bg-slate-800 rounded-lg block">Watermarks & Locks</button>
          <button onClick={() => navigateTo("sign-fill")} className="w-full text-xs font-semibold py-2 px-3 hover:bg-slate-800 rounded-lg block">Signatures & Forms</button>
          <button onClick={() => navigateTo("smart-ai")} className="w-full text-xs font-semibold py-2 px-3 hover:bg-slate-800 rounded-lg block flex justify-between items-center">
            <span>Smart Scan & OCR</span>
            <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">SECURE</span>
          </button>
        </div>
      )}

      {/* MAIN VIEWPORT */}
      <main className="flex-1 p-4 sm:p-8 md:p-10 max-w-7xl mx-auto w-full flex flex-col gap-8 overflow-y-auto">
        
        {/* UPPER STATUS BAR (TAGLINE) */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-slate-200/60 p-4 rounded-2xl gap-3 text-left">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <p className="text-xs font-bold text-slate-700 tracking-wide font-sans">
              100% Free • Unlimited Usage • Fast • Secure • Browser-Based • Privacy First
            </p>
          </div>
          
          <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
            <span>Zhynor Technologies</span>
            <span>|</span>
            <span className="flex items-center gap-1"><Shield size={11} className="text-emerald-500" /> 🔒 LOCAL PROCESSING   |   🚀 BROWSER NATIVE   |   🛡️ PRIVACY FIRST </span>
          </div>
        </div>

        {/* ACTIVE PANEL CONDITIONAL ROUTER */}
        <div className="flex-1">
          {activeTab === "dashboard" && (
            <div className="space-y-8 animate-fade-in text-left">
              
              {/* WELCOME BANNER */}
              <div className="relative overflow-hidden bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="relative z-10 space-y-3">
                  <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono">
                    <Sparkles size={11} /> PROFESSIONAL PDF TOOLKIT
                  </div>
                  
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">
                    Welcome to Zhynor PDF Toolkit
                  </h2>
                  <p className="text-slate-400 text-sm max-w-2xl font-sans">
                    Create, edit, merge, compress, convert, sign, and secure PDF documents directly in your browser.
                    Your files stay on your device—fast, private, and without subscriptions.
                  </p>
                </div>
              </div>

              {/* SERVICE INDICATORS BENTO GRID */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 flex items-start gap-3.5 shadow-xs">
                  <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                    <Shield size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Privacy Certified</h4>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Files are processed on local threads using WebAssembly, meaning they never traverse outside your device.
                    </p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 flex items-start gap-3.5 shadow-xs">
                  <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                    <Activity size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Unlimited Capabilities</h4>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      No document page length, byte weight limits, or queue waiting blocks typical of cloud servers.
                    </p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 flex items-start gap-3.5 shadow-xs">
                  <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                    <Brain size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">On-Device Smart AI</h4>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Zero-cost offline analytical models run privately inside your browser to summarize, query, and compare files instantly.
                    </p>
                  </div>
                </div>
              </div>

              {/* QUICK SELECT LAUNCHERS */}
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block font-display">Tool Quick Launchers</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  <div
                    onClick={() => navigateTo("organize")}
                    className="group bg-white p-5 rounded-2xl border border-slate-200/60 hover:border-emerald-500 transition-all cursor-pointer flex flex-col justify-between h-40 shadow-xs hover:shadow-md"
                  >
                    <div className="w-10 h-10 bg-slate-50 group-hover:bg-emerald-50 text-slate-600 group-hover:text-emerald-600 rounded-xl flex items-center justify-center transition-colors">
                      <Folder size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1">
                        Organize & Merge <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-1">Combine, split pages, rotate, or re-order PDF page layouts.</p>
                    </div>
                  </div>

                  <div
                    onClick={() => navigateTo("edit")}
                    className="group bg-white p-5 rounded-2xl border border-slate-200/60 hover:border-emerald-500 transition-all cursor-pointer flex flex-col justify-between h-40 shadow-xs hover:shadow-md"
                  >
                    <div className="w-10 h-10 bg-slate-50 group-hover:bg-emerald-50 text-slate-600 group-hover:text-emerald-600 rounded-xl flex items-center justify-center transition-colors">
                      <Edit size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1">
                        Visual Canvas Editor <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-1">Draw, add shapes, highlight paragraphs, write notes, or whiteout text blocks.</p>
                    </div>
                  </div>

                  <div
                    onClick={() => navigateTo("convert")}
                    className="group bg-white p-5 rounded-2xl border border-slate-200/60 hover:border-emerald-500 transition-all cursor-pointer flex flex-col justify-between h-40 shadow-xs hover:shadow-md"
                  >
                    <div className="w-10 h-10 bg-slate-50 group-hover:bg-emerald-50 text-slate-600 group-hover:text-emerald-600 rounded-xl flex items-center justify-center transition-colors">
                      <RefreshCw size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1">
                        File Converter <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-1">Convert PNGs, JPGs, WEBP, or plain text to PDFs, and vice versa.</p>
                    </div>
                  </div>

                  <div
                    onClick={() => navigateTo("sign-fill")}
                    className="group bg-white p-5 rounded-2xl border border-slate-200/60 hover:border-emerald-500 transition-all cursor-pointer flex flex-col justify-between h-40 shadow-xs hover:shadow-md"
                  >
                    <div className="w-10 h-10 bg-slate-50 group-hover:bg-emerald-50 text-slate-600 group-hover:text-emerald-600 rounded-xl flex items-center justify-center transition-colors">
                      <Signature size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1">
                        Signatures & Forms <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-1">Place hand-drawn signatures, type initials, or easily fill form elements.</p>
                    </div>
                  </div>

                </div>
              </div>

              {/* RECENT FILES TRACKER */}
              <div className="bg-white rounded-2xl border border-slate-200/60 p-5 sm:p-6 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-slate-400" />
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 font-display">Local Document Log</h3>
                  </div>
                  
                  {recentFiles.length > 0 && (
                    <button
                      onClick={handleClearHistory}
                      className="text-[10px] text-slate-400 hover:text-red-500 font-bold flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Clear Logs
                    </button>
                  )}
                </div>

                {recentFiles.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    No recent local files logs. Upload or compile documents using any of the tools to see activity logs.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-bold">
                          <th className="py-3 px-1">File name</th>
                          <th className="py-3 px-1">Size</th>
                          <th className="py-3 px-1">Timestamp</th>
                          <th className="py-3 px-1 text-center">Favorite</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentFiles.map((file) => (
                          <tr key={file.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                            <td className="py-3 px-1 font-semibold text-slate-700 truncate max-w-[200px]">{file.name}</td>
                            <td className="py-3 px-1 text-slate-500 font-mono text-[10px]">{formatBytes(file.size)}</td>
                            <td className="py-3 px-1 text-slate-400 text-[10px]">{file.date}</td>
                            <td className="py-3 px-1 text-center">
                              <button
                                onClick={() => handleToggleFavorite(file.id)}
                                className={`p-1.5 rounded-md hover:bg-slate-100 transition-colors ${file.isFavorite ? "text-red-500" : "text-slate-300"}`}
                              >
                                <Heart size={14} fill={file.isFavorite ? "currentColor" : "none"} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {activeTab === "organize" && <OrganizePDF />}
          {activeTab === "edit" && <EditPDF />}
          {activeTab === "convert" && <ConvertPDF />}
          {activeTab === "optimize" && <OptimizePDF />}
          {activeTab === "security" && <SecurityPDF />}
          {activeTab === "sign-fill" && <SignFillPDF />}
          {activeTab === "smart-ai" && <SmartAIPDF />}
        </div>

      </main>

      {/* Unique Movable UI Logo for Zhynor PDF Toolkit */}
      <ZhynorMovableLogo />
    </div>
  );
}
