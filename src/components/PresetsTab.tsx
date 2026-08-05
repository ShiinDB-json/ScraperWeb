import React from 'react';
import { SCRAPER_PRESETS } from '../data/presets';
import { ScraperPreset } from '../types';
import { Code2, Play, Globe, Zap, ArrowRight, ShieldCheck } from 'lucide-react';

interface PresetsTabProps {
  onSelectPreset: (preset: ScraperPreset) => void;
}

export const PresetsTab: React.FC<PresetsTabProps> = ({ onSelectPreset }) => {
  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-2">
        <h2 className="text-lg font-bold text-white flex items-center space-x-2">
          <Code2 className="w-5 h-5 text-cyan-400" />
          <span>Preset & Example Scraper Templates</span>
        </h2>
        <p className="text-xs text-slate-400">
          Pilih salah satu template scraper pra-konfigurasi di bawah ini untuk langsung mencoba analisa dan mengeksekusi request.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SCRAPER_PRESETS.map((preset) => (
          <div
            key={preset.id}
            className="bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-5 shadow-lg transition-all space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  {preset.category}
                </span>
                <span className="text-xs font-mono font-semibold text-slate-400 uppercase">
                  {preset.library}
                </span>
              </div>

              <h3 className="text-base font-bold text-white">{preset.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{preset.description}</p>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 font-mono text-[11px] text-cyan-300 truncate select-all">
                {preset.url}
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => onSelectPreset(preset)}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center justify-center space-x-2 cursor-pointer group"
              >
                <span>Muat Scraper Template Ini</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
