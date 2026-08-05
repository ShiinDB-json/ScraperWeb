import React, { useState } from 'react';
import { Zap, Play, Clock, CheckCircle2, AlertTriangle, Layers, Plus, Trash2, ArrowRight, Loader2, Globe, Shield, Search } from 'lucide-react';
import { ScrapeTestResponse, ScrapeEngine, PlaywrightBrowserName } from '../types';
import { OutputJsonPreview } from './OutputJsonPreview';

interface LiveScrapeRunnerProps {
  initialUrl?: string;
  initialMethod?: string;
  initialHeaders?: Record<string, string>;
}

export const LiveScrapeRunner: React.FC<LiveScrapeRunnerProps> = ({
  initialUrl = 'https://quotes.toscrape.com/',
  initialMethod = 'GET',
  initialHeaders = {},
}) => {
  const [url, setUrl] = useState(initialUrl);
  const [method, setMethod] = useState(initialMethod);
  const [timeoutMs, setTimeoutMs] = useState(10000);
  const [followRedirects, setFollowRedirects] = useState(true);
  const [engine, setEngine] = useState<ScrapeEngine>('http');
  const [playwrightBrowser, setPlaywrightBrowser] = useState<PlaywrightBrowserName>('chromium');
  const [waitForSelector, setWaitForSelector] = useState('');

  // Headers list state
  const [headersList, setHeadersList] = useState<{ key: string; value: string }[]>(
    Object.entries(initialHeaders).map(([key, value]) => ({ key, value }))
  );

  // CSS Selectors list state for HTML extraction
  const [selectors, setSelectors] = useState<{ name: string; selector: string; attribute: string }[]>([
    { name: 'quoteText', selector: '.quote .text', attribute: 'text' },
    { name: 'author', selector: '.quote .author', attribute: 'text' },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<ScrapeTestResponse | null>(null);

  const handleAddHeader = () => {
    setHeadersList([...headersList, { key: '', value: '' }]);
  };

  const handleRemoveHeader = (idx: number) => {
    setHeadersList(headersList.filter((_, i) => i !== idx));
  };

  const handleAddSelector = () => {
    setSelectors([...selectors, { name: 'field', selector: '', attribute: 'text' }]);
  };

  const handleRemoveSelector = (idx: number) => {
    setSelectors(selectors.filter((_, i) => i !== idx));
  };

  const handleRunScrapeTest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url) return;

    setIsLoading(true);
    setResponse(null);

    // Convert headers array to object
    const headersObj: Record<string, string> = {};
    headersList.forEach((h) => {
      if (h.key.trim()) {
        headersObj[h.key.trim()] = h.value.trim();
      }
    });

    try {
      const res = await fetch('/api/scrape-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          method,
          headers: headersObj,
          selectors: selectors.filter((s) => s.selector.trim()),
          timeoutMs,
          followRedirects,
          engine,
          waitForSelector: waitForSelector.trim() || undefined,
          playwrightBrowser,
        }),
      });

      const data: ScrapeTestResponse = await res.json();
      setResponse(data);
    } catch (err: any) {
      setResponse({
        success: false,
        error: err.message || 'Gagal menghubungi server scraper runner',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Test Panel Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Zap className="w-5 h-5 text-emerald-400" />
              <span>Live Scraper Test Runner</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Jalankan request HTTP & ekstraksi data secara real-time langsung melalui server backend Node.js.
            </p>
          </div>

          <button
            onClick={() => handleRunScrapeTest()}
            disabled={isLoading}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menghubungi Endpoint...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Jalankan Test Live</span>
              </>
            )}
          </button>
        </div>

        <form onSubmit={handleRunScrapeTest} className="space-y-4">
          {/* Method & URL input */}
          <div className="flex flex-col sm:flex-row items-stretch gap-3">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-cyan-400 focus:border-cyan-500 transition-all uppercase"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>

            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Globe className="w-4 h-4" />
              </div>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/api/v1/data atau https://quotes.toscrape.com/"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 font-mono placeholder-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
              />
            </div>
          </div>

          {/* Engine Selector Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Scrape Engine
              </label>
              <select
                value={engine}
                onChange={(e) => setEngine(e.target.value as ScrapeEngine)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-cyan-400 focus:border-cyan-500 transition-all"
              >
                <option value="http">HTTP (axios + cheerio) — tercepat</option>
                <option value="native">Native (Node http/https + zlib) — tanpa dependency</option>
                <option value="undici">Undici (fetch engine performa tinggi)</option>
                <option value="puppeteer">Puppeteer (stealth headless Chrome)</option>
                <option value="playwright">Playwright (headless browser)</option>
              </select>
            </div>

            {engine === 'playwright' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Playwright Browser
                </label>
                <select
                  value={playwrightBrowser}
                  onChange={(e) => setPlaywrightBrowser(e.target.value as PlaywrightBrowserName)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 focus:border-cyan-500 transition-all"
                >
                  <option value="chromium">Chromium</option>
                  <option value="firefox">Firefox</option>
                  <option value="webkit">WebKit</option>
                </select>
              </div>
            )}

            {(engine === 'puppeteer' || engine === 'playwright') && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tunggu Selector (opsional)
                </label>
                <input
                  type="text"
                  value={waitForSelector}
                  onChange={(e) => setWaitForSelector(e.target.value)}
                  placeholder=".product-list"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 focus:border-cyan-500 transition-all"
                />
              </div>
            )}
          </div>

          {/* Config Settings Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Timeout (ms)
              </label>
              <input
                type="number"
                value={timeoutMs}
                onChange={(e) => setTimeoutMs(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 focus:border-cyan-500 transition-all"
              />
            </div>

            <div className="flex items-center space-x-3 pt-5">
              <label className="flex items-center space-x-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={followRedirects}
                  onChange={(e) => setFollowRedirects(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                  disabled={engine !== 'http'}
                />
                <span>Ikuti Redirect Otomatis (Max 5)</span>
              </label>
            </div>
          </div>

          {/* Optional Headers Editor */}
          <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                <span>Custom HTTP Headers</span>
              </span>
              <button
                type="button"
                onClick={handleAddHeader}
                className="text-xs text-cyan-400 hover:underline flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Header</span>
              </button>
            </div>

            {headersList.map((h, i) => (
              <div key={i} className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Header (e.g. Authorization)"
                  value={h.key}
                  onChange={(e) => {
                    const newH = [...headersList];
                    newH[i].key = e.target.value;
                    setHeadersList(newH);
                  }}
                  className="w-1/3 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200"
                />
                <input
                  type="text"
                  placeholder="Value (e.g. Bearer token_xyz)"
                  value={h.value}
                  onChange={(e) => {
                    const newH = [...headersList];
                    newH[i].value = e.target.value;
                    setHeadersList(newH);
                  }}
                  className="flex-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveHeader(i)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* HTML CSS Selectors for Extraction (Optional) */}
          <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                <Search className="w-3.5 h-3.5 text-emerald-400" />
                <span>CSS Selectors Ekstraksi (Untuk HTML DOM)</span>
              </span>
              <button
                type="button"
                onClick={handleAddSelector}
                className="text-xs text-emerald-400 hover:underline flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Selector</span>
              </button>
            </div>

            {selectors.map((s, i) => (
              <div key={i} className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Key Name (e.g. title)"
                  value={s.name}
                  onChange={(e) => {
                    const newS = [...selectors];
                    newS[i].name = e.target.value;
                    setSelectors(newS);
                  }}
                  className="w-1/4 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200"
                />
                <input
                  type="text"
                  placeholder="CSS Selector (e.g. h1.title, .product-price)"
                  value={s.selector}
                  onChange={(e) => {
                    const newS = [...selectors];
                    newS[i].selector = e.target.value;
                    setSelectors(newS);
                  }}
                  className="flex-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200"
                />
                <select
                  value={s.attribute}
                  onChange={(e) => {
                    const newS = [...selectors];
                    newS[i].attribute = e.target.value;
                    setSelectors(newS);
                  }}
                  className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300"
                >
                  <option value="text">text</option>
                  <option value="href">href</option>
                  <option value="src">src</option>
                  <option value="html">html</option>
                </select>
                <button
                  type="button"
                  onClick={() => handleRemoveSelector(i)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </form>
      </div>

      {/* Response Display Box */}
      {response && (
        <div className="space-y-4">
          {/* Status Metrics Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">HTTP Status</span>
              <div className="flex items-center space-x-1.5 mt-1">
                <span className={`w-2.5 h-2.5 rounded-full ${response.success ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                <span className={`text-sm font-bold font-mono ${response.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {response.statusCode || 'ERROR'} {response.statusText || ''}
                </span>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Response Time</span>
              <div className="flex items-center space-x-1.5 mt-1 font-mono text-sm font-bold text-cyan-400">
                <Clock className="w-3.5 h-3.5" />
                <span>{response.elapsedMs || 0} ms</span>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Content Type</span>
              <span className="text-xs font-mono font-medium text-slate-300 truncate block mt-1">
                {response.contentType || 'unknown'}
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Content Size</span>
              <span className="text-xs font-mono font-bold text-slate-300 block mt-1">
                {response.contentLength ? `${(response.contentLength / 1024).toFixed(1)} KB` : 'N/A'}
              </span>
            </div>
          </div>

          {/* HTML Metadata if available */}
          {response.htmlMeta && (
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2 text-xs">
              <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block">HTML Meta Structure</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-slate-300">
                <div>Title: <span className="text-cyan-300">{response.htmlMeta.title}</span></div>
                <div>Links: <span className="text-emerald-400">{response.htmlMeta.linksCount}</span></div>
                <div>Images: <span className="text-blue-400">{response.htmlMeta.imagesCount}</span></div>
                <div>Tables: <span className="text-amber-400">{response.htmlMeta.tablesCount}</span></div>
              </div>
            </div>
          )}

          {/* Extracted Data JSON */}
          <OutputJsonPreview
            data={response.data || { error: response.error }}
            title="Hasil Live Scraping Response (JSON)"
            subtitle="Data aktual yang berhasil ditarik dan diekstrak oleh Node.js backend."
          />
        </div>
      )}
    </div>
  );
};
