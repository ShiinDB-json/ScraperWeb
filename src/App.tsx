/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { UrlAnalyzer } from './components/UrlAnalyzer';
import { AnalysisReport } from './components/AnalysisReport';
import { CodeViewer } from './components/CodeViewer';
import { OutputJsonPreview } from './components/OutputJsonPreview';
import { LiveScrapeRunner } from './components/LiveScrapeRunner';
import { CurlParserModal } from './components/CurlParserModal';
import { PresetsTab } from './components/PresetsTab';
import { SessionManager } from './components/SessionManager';
import { RailwayGuide } from './components/RailwayGuide';
import { AnalysisResult, SavedSession, ScraperPreset } from './types';
import { Terminal, Sparkles, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'analyzer' | 'runner' | 'history' | 'railway' | 'presets'>('analyzer');
  const [strictNoComments, setStrictNoComments] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefactoring, setIsRefactoring] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [curlModalOpen, setCurlModalOpen] = useState<boolean>(false);

  // Sessions History (Server IP-Isolated)
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [userIp, setUserIp] = useState<string>('');

  // Initial runner settings passed from analyzer or presets
  const [runnerUrl, setRunnerUrl] = useState<string>('https://quotes.toscrape.com/');
  const [runnerHeaders, setRunnerHeaders] = useState<Record<string, string>>({});

  // Fetch IP-isolated sessions from server
  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/sessions');
      const data = await res.json();
      if (data.success) {
        setSessions(data.sessions || []);
        setUserIp(data.ip || '');
      }
    } catch (e) {
      console.error('Gagal mengambil sesi IP dari server', e);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const saveSession = async (url: string, result: AnalysisResult, refactorPrompt?: string) => {
    const sessionId = activeSessionId || 'session-' + Date.now();
    const title = url ? `Scraper: ${url.replace(/^https?:\/\//, '').split('/')[0]}` : 'Custom Scraper Session';

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sessionId,
          title,
          targetUrl: url,
          result,
          refactorPrompt,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveSessionId(sessionId);
        fetchSessions();
      }
    } catch (e) {
      console.error('Gagal menyimpan sesi ke server', e);
    }
  };

  const handleAnalyze = async (data: {
    url: string;
    curlInput: string;
    rawContent: string;
    userPrompt: string;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      if (data.url) setRunnerUrl(data.url);

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          strictNoComments,
        }),
      });

      const responseData = await res.json();

      if (!res.ok || !responseData.success) {
        throw new Error(responseData.error || 'Gagal melakukan analisis website');
      }

      setAnalysisResult(responseData.result);
      await saveSession(data.url, responseData.result);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem saat menganalisis target');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefactor = async (refactorPrompt: string) => {
    if (!analysisResult) return;
    setIsRefactoring(true);
    setError(null);

    try {
      const res = await fetch('/api/refactor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentCode: analysisResult.sourceCode,
          refactorPrompt,
          targetUrl: runnerUrl,
          strictNoComments,
        }),
      });

      const responseData = await res.json();

      if (!res.ok || !responseData.success) {
        throw new Error(responseData.error || 'Gagal merefaktor kode scraper');
      }

      setAnalysisResult(responseData.result);
      await saveSession(runnerUrl, responseData.result, refactorPrompt);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat merefaktor scraper');
    } finally {
      setIsRefactoring(false);
    }
  };

  const handleSelectSession = (session: SavedSession) => {
    setAnalysisResult(session.result);
    setRunnerUrl(session.targetUrl);
    setActiveSessionId(session.id);
    setActiveTab('analyzer');
  };

  const handleDeleteSession = async (id: string) => {
    try {
      await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
      if (activeSessionId === id) {
        setActiveSessionId(null);
      }
      fetchSessions();
    } catch (e) {
      console.error('Gagal menghapus sesi', e);
    }
  };

  const handleClearAllSessions = async () => {
    if (confirm('Apakah Anda yakin ingin menghapus seluruh riwayat sesi tersimpan untuk IP Anda?')) {
      try {
        await fetch('/api/sessions', { method: 'DELETE' });
        setActiveSessionId(null);
        fetchSessions();
      } catch (e) {
        console.error('Gagal menghapus semua sesi', e);
      }
    }
  };

  const handleSelectPreset = (preset: ScraperPreset) => {
    setRunnerUrl(preset.url);
    if (preset.headers) setRunnerHeaders(preset.headers);
    setActiveTab('analyzer');

    // Trigger analysis for the preset URL
    handleAnalyze({
      url: preset.url,
      curlInput: preset.sampleCurl || '',
      rawContent: '',
      userPrompt: `Preset Scraper: ${preset.title}. ${preset.description}`,
    });
  };

  const handleApplyCurlParsed = (data: { url: string; method: string; headers: Record<string, string> }) => {
    setRunnerUrl(data.url);
    setRunnerHeaders(data.headers);

    handleAnalyze({
      url: data.url,
      curlInput: `curl "${data.url}" -X ${data.method}`,
      rawContent: '',
      userPrompt: `Analyzed from cURL command with ${Object.keys(data.headers).length} custom headers`,
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-cyan-500 selection:text-slate-950 pb-16">
      {/* Top Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        strictNoComments={strictNoComments}
        setStrictNoComments={setStrictNoComments}
        sessionCount={sessions.length}
        onSelectPreset={(id) => {}}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Tab 1: Analyzer & Generator */}
        {activeTab === 'analyzer' && (
          <div className="space-y-8">
            {/* Input Form */}
            <UrlAnalyzer
              onAnalyze={handleAnalyze}
              isLoading={isLoading}
              onOpenCurlModal={() => setCurlModalOpen(true)}
            />

            {/* Error Message */}
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl flex items-start space-x-3 text-rose-300 text-xs">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-sm">Gagal Mengirim Request:</span>
                  <p>{error}</p>
                </div>
              </div>
            )}

            {/* Analysis & Generation Results */}
            {analysisResult && (
              <div className="space-y-8 animate-fadeIn">
                {/* Workflow Status Banner */}
                <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950 border border-slate-800 p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Analisis & Generation Selesai</h3>
                      <p className="text-xs text-slate-400">
                        Scraper Node.js modular berhasil dibuat/direfaktor sesuai standar Aturan Web Scraping Expert.
                      </p>
                    </div>
                  </div>

                  {strictNoComments && (
                    <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-semibold flex items-center space-x-1.5">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Strict Rule Applied: Zero Code Comments</span>
                    </div>
                  )}
                </div>

                {/* 1. Website Analysis & Request Specifications */}
                <AnalysisReport result={analysisResult} />

                {/* 2. Source Code Node.js & Refactoring */}
                <CodeViewer
                  sourceCode={analysisResult.sourceCode}
                  caraMenjalankan={analysisResult.caraMenjalankan}
                  strictNoComments={strictNoComments}
                  onRunTest={() => setActiveTab('runner')}
                  onRefactor={handleRefactor}
                  isRefactoring={isRefactoring}
                />

                {/* 3. Output JSON Preview */}
                {analysisResult.contohOutputJson && (
                  <OutputJsonPreview data={analysisResult.contohOutputJson} />
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Live Scrape Runner */}
        {activeTab === 'runner' && (
          <LiveScrapeRunner
            initialUrl={runnerUrl}
            initialHeaders={runnerHeaders}
          />
        )}

        {/* Tab 3: Sesi Lama & Riwayat */}
        {activeTab === 'history' && (
          <SessionManager
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSession}
            onDeleteSession={handleDeleteSession}
            onClearAll={handleClearAllSessions}
          />
        )}

        {/* Tab 4: Railway & Cloudflare Bypass Guide */}
        {activeTab === 'railway' && <RailwayGuide />}

        {/* Tab 5: Presets & Templates */}
        {activeTab === 'presets' && (
          <PresetsTab onSelectPreset={handleSelectPreset} />
        )}
      </main>

      {/* cURL Inspector Modal */}
      <CurlParserModal
        isOpen={curlModalOpen}
        onClose={() => setCurlModalOpen(false)}
        onApplyParsed={handleApplyCurlParsed}
      />
    </div>
  );
}
