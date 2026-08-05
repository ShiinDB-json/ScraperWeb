import React from 'react';
import { Terminal, Cpu, Code2, Sparkles, ShieldCheck, Zap, History } from 'lucide-react';

interface HeaderProps {
  onSelectPreset: (presetId: string) => void;
  strictNoComments: boolean;
  setStrictNoComments: (val: boolean) => void;
  activeTab: 'analyzer' | 'runner' | 'history' | 'presets';
  setActiveTab: (tab: 'analyzer' | 'runner' | 'history' | 'presets') => void;
  sessionCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  strictNoComments,
  setStrictNoComments,
  activeTab,
  setActiveTab,
  sessionCount = 0,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 backdrop-blur-md bg-slate-900/90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/20 text-white">
              <Terminal className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold text-white tracking-tight">
                  Node.js Web Scraping Expert
                </h1>
                <span className="px-2 py-0.5 text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full flex items-center space-x-1">
                  <Sparkles className="w-3 h-3" />
                  <span>AI Engine</span>
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Simple & powerful web scraping engine, anti-Cloudflare, JSDOM, & Railway ready
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="hidden lg:flex items-center space-x-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
            <button
              onClick={() => setActiveTab('analyzer')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center space-x-1.5 ${
                activeTab === 'analyzer'
                  ? 'bg-cyan-500 text-slate-950 font-semibold shadow-md shadow-cyan-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Analyzer</span>
            </button>
            <button
              onClick={() => setActiveTab('runner')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center space-x-1.5 ${
                activeTab === 'runner'
                  ? 'bg-cyan-500 text-slate-950 font-semibold shadow-md shadow-cyan-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Live Test</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center space-x-1.5 ${
                activeTab === 'history'
                  ? 'bg-cyan-500 text-slate-950 font-semibold shadow-md shadow-cyan-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Sesi IP ({sessionCount})</span>
            </button>
            <button
              onClick={() => setActiveTab('railway')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center space-x-1.5 ${
                activeTab === 'railway'
                  ? 'bg-cyan-500 text-slate-950 font-semibold shadow-md shadow-cyan-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Railway & CF Bypass</span>
            </button>
            <button
              onClick={() => setActiveTab('presets')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center space-x-1.5 ${
                activeTab === 'presets'
                  ? 'bg-cyan-500 text-slate-950 font-semibold shadow-md shadow-cyan-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Presets</span>
            </button>
          </div>

          {/* Strict No Comments Rule Toggle */}
          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-2 cursor-pointer bg-slate-800/60 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs transition-all">
              <input
                type="checkbox"
                checked={strictNoComments}
                onChange={(e) => setStrictNoComments(e.target.checked)}
                className="w-3.5 h-3.5 accent-cyan-500 rounded cursor-pointer"
              />
              <span className="text-slate-300 font-medium flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tanpa Komentar (Strict Rule)</span>
              </span>
            </label>
          </div>
        </div>
      </div>
    </header>
  );
};
