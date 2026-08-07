import React, { useState } from 'react';
import { Search, Globe, Code, FileText, AlertCircle, Loader2, Sparkles, Terminal } from 'lucide-react';

interface UrlAnalyzerProps {
  onAnalyze: (data: {
    url: string;
    curlInput: string;
    rawContent: string;
    userPrompt: string;
  }) => void;
  isLoading: boolean;
  onOpenCurlModal: () => void;
}

export const UrlAnalyzer: React.FC<UrlAnalyzerProps> = ({
  onAnalyze,
  isLoading,
  onOpenCurlModal,
}) => {
  const [inputType, setInputType] = useState<'url' | 'curl' | 'prompt'>('url');
  const [url, setUrl] = useState('');
  const [curlInput, setCurlInput] = useState('');
  const [userPrompt, setUserPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAnalyze({
      url: inputType === 'url' ? url : '',
      curlInput: inputType === 'curl' ? curlInput : '',
      rawContent: '',
      userPrompt,
    });
  };

  const handleQuickExample = (exampleUrl: string) => {
    setInputType('url');
    setUrl(exampleUrl);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Title & Input Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Search className="w-5 h-5 text-cyan-400" />
            <span>Analisis & Generate Scraper</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Masukkan URL target, paste perintah cURL dari browser, atau deskripsikan data yang ingin diambil.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700/60 text-xs">
          <button
            type="button"
            onClick={() => setInputType('url')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1.5 ${
              inputType === 'url'
                ? 'bg-cyan-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>URL Website</span>
          </button>
          <button
            type="button"
            onClick={() => setInputType('curl')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1.5 ${
              inputType === 'curl'
                ? 'bg-cyan-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>cURL Command</span>
          </button>
          <button
            type="button"
            onClick={() => setInputType('prompt')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1.5 ${
              inputType === 'prompt'
                ? 'bg-cyan-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Deskripsi / HTML</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Input Field Based on Selection */}
        {inputType === 'url' && (
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              URL Target Website
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Globe className="w-4 h-4" />
              </div>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/products atau https://api.example.com/v1/items"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
              />
            </div>
            {/* Quick Suggestions */}
            <div className="flex flex-wrap items-center gap-2 mt-2.5 text-xs text-slate-400">
              <span className="text-slate-500 font-medium">Contoh URL Cepat:</span>
              <button
                type="button"
                onClick={() => handleQuickExample('https://quotes.toscrape.com/')}
                className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-lg text-slate-300 hover:text-cyan-400 transition-colors font-mono"
              >
                quotes.toscrape.com (HTML)
              </button>
              <button
                type="button"
                onClick={() => handleQuickExample('https://dummyjson.com/products')}
                className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-lg text-slate-300 hover:text-cyan-400 transition-colors font-mono"
              >
                dummyjson.com/products (API)
              </button>
              <button
                type="button"
                onClick={() => handleQuickExample('https://jsonplaceholder.typicode.com/posts')}
                className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-lg text-slate-300 hover:text-cyan-400 transition-colors font-mono"
              >
                jsonplaceholder (JSON)
              </button>
            </div>
          </div>
        )}

        {inputType === 'curl' && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Paste Request cURL (dari Network Tab Inspect Element)
              </label>
              <button
                type="button"
                onClick={onOpenCurlModal}
                className="text-xs text-cyan-400 hover:underline font-medium"
              >
                Atau gunakan Visual cURL Helper
              </button>
            </div>
            <textarea
              rows={4}
              value={curlInput}
              onChange={(e) => setCurlInput(e.target.value)}
              placeholder={`curl 'https://api.example.com/v1/data' \\
  -H 'accept: application/json' \\
  -H 'authorization: Bearer token_xxx' \\
  -H 'user-agent: Mozilla/5.0...'`}
              className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-cyan-300 font-mono placeholder-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
            />
          </div>
        )}

        {inputType === 'prompt' && (
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Deskripsi Target Website & Kebutuhan Scraper
            </label>
            <textarea
              rows={4}
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="Contoh: Saya ingin mengambil daftar berita dari website detik/kompas beserta judul, tanggal publikasi, link artikel, dan gambar thumbnail. Sertakan pagination hingga 5 halaman."
              className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
            />
          </div>
        )}

        {/* Options & Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Custom Instruction / Additional Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Catatan Khusus (Opsional)
            </label>
            <input
              type="text"
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="Contoh: Ambil hanya item yang stoknya ada, tambahkan delay 2 detik tiap page"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 placeholder-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-6 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-cyan-500/20 transition-all transform active:scale-[0.99] flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Menganalisis Website & Menghasilkan Scraper...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Mulai Analisis & Buat Node.js Scraper</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
