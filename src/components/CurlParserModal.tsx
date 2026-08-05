import React, { useState } from 'react';
import { Terminal, X, ArrowRight, Check, Loader2 } from 'lucide-react';

interface CurlParserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyParsed: (data: {
    url: string;
    method: string;
    headers: Record<string, string>;
  }) => void;
}

export const CurlParserModal: React.FC<CurlParserModalProps> = ({
  isOpen,
  onClose,
  onApplyParsed,
}) => {
  const [curlText, setCurlText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [parsedResult, setParsedResult] = useState<any>(null);

  if (!isOpen) return null;

  const handleParse = async () => {
    if (!curlText.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/curl-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ curl: curlText }),
      });
      const data = await res.json();
      if (data.success) {
        setParsedResult(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (parsedResult) {
      onApplyParsed({
        url: parsedResult.url,
        method: parsedResult.method,
        headers: parsedResult.headers || {},
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl space-y-0">
        {/* Modal Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Visual cURL Inspector & Parser</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-400">
            Salin cURL request dari Chrome / Firefox DevTools (Network tab -&gt; Right click request -&gt; Copy as cURL).
          </p>

          <textarea
            rows={5}
            value={curlText}
            onChange={(e) => setCurlText(e.target.value)}
            placeholder={`curl 'https://api.example.com/v1/products' \\
  -H 'authorization: Bearer token_xyz' \\
  -H 'accept: application/json'`}
            className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-cyan-300 placeholder-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
          />

          <button
            onClick={handleParse}
            disabled={isLoading || !curlText.trim()}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Parse cURL Request</span>}
          </button>

          {parsedResult && (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
              <span className="text-emerald-400 font-bold block text-[11px] uppercase">Berhasil Di-parse:</span>
              <div className="text-slate-300">Method: <span className="text-cyan-400 font-bold">{parsedResult.method}</span></div>
              <div className="text-slate-300 break-all">URL: <span className="text-cyan-300">{parsedResult.url}</span></div>
              <div className="text-slate-400 text-[11px]">Headers: {Object.keys(parsedResult.headers || {}).length} detected</div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-all"
          >
            Batal
          </button>
          <button
            onClick={handleApply}
            disabled={!parsedResult}
            className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center space-x-1.5 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>Terapkan ke Scraper</span>
          </button>
        </div>
      </div>
    </div>
  );
};
