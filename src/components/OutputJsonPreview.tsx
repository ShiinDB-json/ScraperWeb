import React, { useState } from 'react';
import { Copy, Download, Search, Check, FileJson, Hash, Brackets } from 'lucide-react';

interface OutputJsonPreviewProps {
  data: any;
  title?: string;
  subtitle?: string;
}

export const OutputJsonPreview: React.FC<OutputJsonPreviewProps> = ({
  data,
  title = "6. Contoh Output JSON (Struktur Rapi & Konsisten)",
  subtitle = "Output scraper terstruktur dan siap dikonsumsi oleh database, API, atau frontend.",
}) => {
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'pretty' | 'compact'>('pretty');

  const jsonString = typeof data === 'string' ? data : JSON.stringify(data, null, viewMode === 'pretty' ? 2 : 0);

  const itemCount = Array.isArray(data) ? data.length : typeof data === 'object' && data !== null ? Object.keys(data).length : 1;

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scraped_output.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden space-y-0">
      {/* Header */}
      <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
            <FileJson className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <span>{title}</span>
              <span className="px-2 py-0.5 text-xs font-semibold bg-slate-800 text-emerald-400 border border-slate-700 rounded-full flex items-center space-x-1">
                <Hash className="w-3 h-3" />
                <span>{itemCount} Item / Key</span>
              </span>
            </h3>
            <p className="text-xs text-slate-400">{subtitle}</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {/* Format Toggle */}
          <div className="bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs flex items-center">
            <button
              onClick={() => setViewMode('pretty')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                viewMode === 'pretty' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Pretty
            </button>
            <button
              onClick={() => setViewMode('compact')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                viewMode === 'compact' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Compact
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Salin JSON</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export .json</span>
          </button>
        </div>
      </div>

      {/* Code Container */}
      <div className="p-4 bg-slate-950 max-h-[500px] overflow-y-auto">
        <pre className="p-4 bg-slate-900 rounded-xl border border-slate-800 text-xs text-emerald-300 font-mono overflow-x-auto leading-relaxed select-all">
          <code>{jsonString}</code>
        </pre>
      </div>
    </div>
  );
};
