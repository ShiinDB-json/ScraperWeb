import React, { useState } from 'react';
import { Server, ShieldAlert, Cpu, Terminal, CheckCircle2, Copy, Check, ExternalLink, Zap } from 'lucide-react';

export const RailwayGuide: React.FC = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const sampleDockerfile = `FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/server.cjs"]`;

  const sampleCfBypassPuppeteer = `import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

async function scrapeWithStealth(url) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36');

  console.log('Navigating to target...');
  await page.goto(url, { waitUntil: 'networkidle2' });

  // Wait for Cloudflare challenge if present
  await page.waitForTimeout(5000);

  const content = await page.content();
  await browser.close();
  return content;
}`;

  return (
    <div className="space-y-6">
      {/* Railway Deployment Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center space-x-3 text-cyan-400 font-bold text-lg">
          <Server className="w-6 h-6" />
          <span>Panduan Deploy Scraper ke Railway.app</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Aplikasi ini sudah dilengkapi dengan <code className="text-cyan-300 font-mono">Dockerfile</code>, <code className="text-cyan-300 font-mono">railway.json</code>, dan dukungan port dinamis (<code className="text-cyan-300 font-mono">process.env.PORT</code>) sehingga Anda bisa langsung medeploynya ke <strong>Railway.app</strong> hanya dengan beberapa klik.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5">
            <span className="text-cyan-400 font-bold text-xs uppercase block">Langkah 1</span>
            <h4 className="text-sm font-bold text-white">Push ke GitHub</h4>
            <p className="text-xs text-slate-400">Export kode proyek ini ke GitHub melalui menu Settings AI Studio.</p>
          </div>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5">
            <span className="text-cyan-400 font-bold text-xs uppercase block">Langkah 2</span>
            <h4 className="text-sm font-bold text-white">Connect di Railway</h4>
            <p className="text-xs text-slate-400">Buka Railway.app &rarr; New Project &rarr; Deploy from GitHub Repo.</p>
          </div>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5">
            <span className="text-cyan-400 font-bold text-xs uppercase block">Langkah 3</span>
            <h4 className="text-sm font-bold text-white">Set Environment Variables</h4>
            <p className="text-xs text-slate-400">Tambahkan <code className="text-cyan-300">GEMINI_API_KEY</code> di menu Variables Railway.</p>
          </div>
        </div>

        {/* Dockerfile Code Block */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase font-mono">Dockerfile Production untuk Railway:</span>
            <button
              onClick={() => handleCopy(sampleDockerfile, 'dockerfile')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg flex items-center space-x-1 cursor-pointer"
            >
              {copiedSection === 'dockerfile' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSection === 'dockerfile' ? 'Tersalin' : 'Salin Dockerfile'}</span>
            </button>
          </div>
          <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs text-cyan-300 font-mono overflow-x-auto max-h-[220px]">
            <code>{sampleDockerfile}</code>
          </pre>
        </div>
      </div>

      {/* Cloudflare Bypass & Stealth Guide */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center space-x-3 text-amber-400 font-bold text-lg">
          <ShieldAlert className="w-6 h-6" />
          <span>Teknik Lewati Proteksi Cloudflare, Turnstile & WAF</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Jika website target menggunakan proteksi ketat seperti Cloudflare V2 Challenge, Turnstile, atau Akamai, gunakan rekomendasi teknik berikut:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center space-x-2 text-cyan-400 font-bold text-xs">
              <Zap className="w-4 h-4" />
              <span>1. Cloudscraper / Axios CookieJar</span>
            </div>
            <p className="text-xs text-slate-400">
              Sangat cepat tanpa berat browser. Menyelesaikan tantangan JavaScript Cloudflare ringan & menjaga cookie session.
            </p>
            <div className="bg-slate-900 p-2.5 rounded-lg text-[11px] font-mono text-cyan-300/90 border border-slate-800">
              npm install cloudscraper axios-cookiejar-support tough-cookie
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center space-x-2 text-cyan-400 font-bold text-xs">
              <Cpu className="w-4 h-4" />
              <span>2. Puppeteer / Playwright Stealth</span>
            </div>
            <p className="text-xs text-slate-400">
              Membuat browser Chrome asli dengan plugin penyamaran untuk melewati Turnstile & WAF ketat.
            </p>
            <div className="bg-slate-900 p-2.5 rounded-lg text-[11px] font-mono text-cyan-300/90 border border-slate-800">
              npm install puppeteer-extra puppeteer-extra-plugin-stealth
            </div>
          </div>
        </div>

        {/* Puppeteer Code Example */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase font-mono">Template Puppeteer Stealth (Cloudflare Anti-Detection):</span>
            <button
              onClick={() => handleCopy(sampleCfBypassPuppeteer, 'puppeteer')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg flex items-center space-x-1 cursor-pointer"
            >
              {copiedSection === 'puppeteer' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSection === 'puppeteer' ? 'Tersalin' : 'Salin Code'}</span>
            </button>
          </div>
          <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs text-cyan-300 font-mono overflow-x-auto max-h-[260px]">
            <code>{sampleCfBypassPuppeteer}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
