import React, { useState } from 'react';
import { Copy, Download, Check, Play, Terminal, Package, PlayCircle, ShieldCheck, Sparkles, Wrench, Loader2 } from 'lucide-react';

interface CodeViewerProps {
  sourceCode: string;
  caraMenjalankan: string;
  strictNoComments: boolean;
  onRunTest: () => void;
  onRefactor?: (prompt: string) => Promise<void>;
  isRefactoring?: boolean;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  sourceCode,
  caraMenjalankan,
  strictNoComments,
  onRunTest,
  onRefactor,
  isRefactoring = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'code' | 'instructions' | 'package' | 'refactor'>('code');
  const [refactorInput, setRefactorInput] = useState('');

  const handleCopy = () => {
    navigator.clipboard.writeText(sourceCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([sourceCode], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scraper.js';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRefactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refactorInput.trim() || !onRefactor) return;
    await onRefactor(refactorInput);
    setRefactorInput('');
  };

  const samplePackageJson = `{
  "name": "nodejs-web-scraper",
  "version": "1.0.0",
  "type": "module",
  "main": "scraper.js",
  "scripts": {
    "start": "node scraper.js"
  },
  "dependencies": {
    "axios": "^1.7.0",
    "cheerio": "^1.0.0"
  }
}`;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Header Bar */}
      <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
            <CodeViewerIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <span>4. Source Code Node.js Scraper Lengkap</span>
              {strictNoComments && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Strict (Tanpa Komentar)</span>
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              Script Node.js siap jalan dengan retry, timeout, user-agent, & JSON output
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('refactor')}
            className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-md shadow-cyan-500/20 flex items-center space-x-1.5 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Refactor / Perbagus Kode</span>
          </button>
          <button
            onClick={onRunTest}
            className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-md shadow-emerald-500/20 flex items-center space-x-1.5 cursor-pointer"
          >
            <PlayCircle className="w-4 h-4" />
            <span>Uji Coba Scraping Live</span>
          </button>
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
                <span>Salin Kode</span>
              </>
            )}
          </button>
          <button
            onClick={handleDownload}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .js</span>
          </button>
        </div>
      </div>

      {/* Code Navigation Tabs */}
      <div className="bg-slate-950/60 px-6 pt-2 border-b border-slate-800 flex items-center space-x-4 text-xs font-medium">
        <button
          onClick={() => setActiveTab('code')}
          className={`pb-2 border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'code'
              ? 'border-cyan-400 text-cyan-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>scraper.js</span>
        </button>
        <button
          onClick={() => setActiveTab('refactor')}
          className={`pb-2 border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'refactor'
              ? 'border-cyan-400 text-cyan-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wrench className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-cyan-300 font-bold">Refactor / Perbagus Scraper</span>
        </button>
        <button
          onClick={() => setActiveTab('instructions')}
          className={`pb-2 border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'instructions'
              ? 'border-cyan-400 text-cyan-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Play className="w-3.5 h-3.5" />
          <span>5. Cara Menjalankan Project</span>
        </button>
        <button
          onClick={() => setActiveTab('package')}
          className={`pb-2 border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'package'
              ? 'border-cyan-400 text-cyan-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>package.json</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="p-4 bg-slate-950 min-h-[350px]">
        {activeTab === 'code' && (
          <pre className="p-4 bg-slate-900 rounded-xl border border-slate-800 text-xs text-cyan-300 font-mono overflow-x-auto leading-relaxed select-all">
            <code>{sourceCode}</code>
          </pre>
        )}

        {activeTab === 'refactor' && (
          <div className="space-y-4">
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center space-x-2 text-cyan-400 font-bold text-sm">
                <Sparkles className="w-4 h-4" />
                <span>Minta AI Refaktor & Perbagus Kode Scraper Ini</span>
              </div>
              <p className="text-xs text-slate-400">
                Apakah ada field yang kurang, butuh pagination, perlu penanganan error khusus, atau ingin mengubah format JSON? Tuliskan permintaan perbaikan di bawah.
              </p>

              <form onSubmit={handleRefactorSubmit} className="space-y-3">
                <textarea
                  rows={3}
                  value={refactorInput}
                  onChange={(e) => setRefactorInput(e.target.value)}
                  placeholder="Contoh: Tambahkan pagination hingga 5 halaman, atau ekstraksi juga link gambar HD, tambahkan delay 2 detik tiap request untuk menghindari rate limit."
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                />

                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    <span className="text-slate-500">Quick Prompt:</span>
                    <button
                      type="button"
                      onClick={() => setRefactorInput('Tambahkan pagination otomatis hingga 5 halaman')}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
                    >
                      + Pagination
                    </button>
                    <button
                      type="button"
                      onClick={() => setRefactorInput('Tambahkan delay random 1-3 detik di antara request agar aman dari rate limit')}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
                    >
                      + Delay Anti Rate-Limit
                    </button>
                    <button
                      type="button"
                      onClick={() => setRefactorInput('Ekstrak juga metadata lengkap seperti tanggal, author, dan statistik')}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
                    >
                      + Metadata Extra
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isRefactoring || !refactorInput.trim()}
                    className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {isRefactoring ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Merefaktor Kode...</span>
                      </>
                    ) : (
                      <>
                        <Wrench className="w-4 h-4" />
                        <span>Jalankan Refaktor AI</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Current Code Preview */}
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase block mb-1.5">Kode Saat Ini:</span>
              <pre className="p-4 bg-slate-900 rounded-xl border border-slate-800 text-xs text-cyan-300/80 font-mono overflow-x-auto max-h-[300px]">
                <code>{sourceCode}</code>
              </pre>
            </div>
          </div>
        )}

        {activeTab === 'instructions' && (
          <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-3 font-mono">
            <h4 className="font-bold text-white text-sm">Langkah Menjalankan Scraper di Local Engine Node.js:</h4>
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-cyan-400 space-y-2">
              <p className="text-slate-400">// 1. Buat folder project baru & masuk ke direktori</p>
              <p>mkdir my-scraper && cd my-scraper</p>
              <p className="text-slate-400">// 2. Inisialisasi package.json (gunakan ES Module)</p>
              <p>npm init -y</p>
              <p>npm pkg set type="module"</p>
              <p className="text-slate-400">// 3. Install dependency scraper</p>
              <p>npm install axios cheerio</p>
              <p className="text-slate-400">// 4. Simpan kode ke file scraper.js lalu jalankan</p>
              <p>node scraper.js</p>
            </div>
            {caraMenjalankan && (
              <div className="mt-4 p-3 bg-slate-800/50 rounded-lg text-slate-300 text-xs font-sans">
                <span className="font-semibold text-cyan-400">Panduan AI Tambahan:</span>
                <p className="mt-1 whitespace-pre-wrap">{caraMenjalankan}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'package' && (
          <pre className="p-4 bg-slate-900 rounded-xl border border-slate-800 text-xs text-amber-300 font-mono overflow-x-auto select-all">
            <code>{samplePackageJson}</code>
          </pre>
        )}
      </div>
    </div>
  );
};

function CodeViewerIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  );
}
