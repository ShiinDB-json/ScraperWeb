import React from 'react';
import { AnalysisResult } from '../types';
import { ShieldAlert, Globe, Key, Database, Wrench, ArrowRight, Layers, Lock, FileCode } from 'lucide-react';

interface AnalysisReportProps {
  result: AnalysisResult;
}

export const AnalysisReport: React.FC<AnalysisReportProps> = ({ result }) => {
  const {
    analisisWebsite,
    requestDetail,
    libraryChoices,
    technicalNotes,
  } = result;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Section Header */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-2">
          <Globe className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-bold text-white">1. Hasil Analisis Website & Arsitektur Request</h3>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Identifikasi endpoint API, struktur HTML, metode pengambilan data, dan persyaratan otentikasi.
        </p>
      </div>

      {/* Website Overview */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed space-y-2">
        <h4 className="font-semibold text-cyan-400 flex items-center space-x-1.5 text-sm">
          <Layers className="w-4 h-4" />
          <span>Analisis Struktur & Cara Kerja Website</span>
        </h4>
        <p className="whitespace-pre-wrap text-slate-300">{analisisWebsite}</p>
      </div>

      {/* Request Specifications Grid */}
      <div className="space-y-3">
        <h4 className="font-semibold text-white text-xs uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
          <Database className="w-4 h-4 text-cyan-400" />
          <span>2. Detail Request HTTP & Endpoint API</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Target Endpoint & Method */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-xs font-medium text-slate-500 uppercase block">Endpoint & Method</span>
            <div className="flex items-center space-x-2">
              <span className={`px-2.5 py-1 text-xs font-bold rounded-lg uppercase ${
                requestDetail.method === 'GET' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                requestDetail.method === 'POST' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
                {requestDetail.method || 'GET'}
              </span>
              <span className="font-mono text-xs text-cyan-300 break-all select-all">
                {requestDetail.targetEndpoint || 'N/A'}
              </span>
            </div>
          </div>

          {/* Authentication & Cookies */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-xs font-medium text-slate-500 uppercase block">Otentikasi & Session Cookies</span>
            <div className="space-y-1 text-xs font-mono">
              <div className="text-slate-300 flex items-center space-x-1">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>Auth: {requestDetail.authentication || 'Tidak membutuhkan auth khusus (Public)'}</span>
              </div>
              {requestDetail.cookies && (
                <div className="text-slate-400 truncate text-[11px] select-all">
                  Cookie: {requestDetail.cookies}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Headers Table */}
        {requestDetail.recommendedHeaders && (
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-xs font-medium text-slate-500 uppercase block">Headers yang Direkomendasikan</span>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500">
                    <th className="pb-2 font-medium">Header</th>
                    <th className="pb-2 font-medium">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {Object.entries(requestDetail.recommendedHeaders).map(([key, val]) => (
                    <tr key={key}>
                      <td className="py-1.5 text-cyan-400 pr-4">{key}</td>
                      <td className="py-1.5 text-slate-300 break-all">{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Library Choice Rationale */}
      <div className="space-y-3">
        <h4 className="font-semibold text-white text-xs uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
          <Wrench className="w-4 h-4 text-cyan-400" />
          <span>3. Library yang Dipilih & Alasannya</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {libraryChoices && libraryChoices.map((lib, idx) => (
            <div key={idx} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-start space-x-3">
              <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/20 mt-0.5">
                <FileCode className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-sm text-white font-mono">{lib.name}</span>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{lib.reason}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Protections & Anti-Bot Notes */}
      {technicalNotes && (
        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl text-xs space-y-1 text-amber-200">
          <div className="flex items-center space-x-2 font-semibold text-amber-400">
            <ShieldAlert className="w-4 h-4" />
            <span>Catatan Teknis Proteksi & Mitigasi Anti-Bot</span>
          </div>
          <p className="text-amber-300/90 leading-relaxed whitespace-pre-wrap">{technicalNotes}</p>
        </div>
      )}
    </div>
  );
};
