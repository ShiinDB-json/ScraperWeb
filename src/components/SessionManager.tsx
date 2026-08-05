import React from 'react';
import { SavedSession } from '../types';
import { History, Play, Trash2, Clock, Globe, ArrowRight, ExternalLink, Sparkles, ShieldCheck } from 'lucide-react';

interface SessionManagerProps {
  sessions: SavedSession[];
  activeSessionId: string | null;
  onSelectSession: (session: SavedSession) => void;
  onDeleteSession: (sessionId: string) => void;
  onClearAll: () => void;
}

export const SessionManager: React.FC<SessionManagerProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onClearAll,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <History className="w-5 h-5 text-cyan-400" />
              <span>Sesi Lama & Riwayat Scraper</span>
            </h2>
            <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold rounded-full flex items-center space-x-1">
              <ShieldCheck className="w-3 h-3" />
              <span>Terisolasi per IP</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Kelola, muat ulang, dan refaktor kembali scraper Anda. Sesi tersimpan aman & tidak dapat dilihat pengguna dari IP lain.
          </p>
        </div>

        {sessions.length > 0 && (
          <button
            onClick={onClearAll}
            className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-medium transition-all flex items-center space-x-1.5 self-start sm:self-auto cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus Semua Sesi</span>
          </button>
        )}
      </div>

      {/* Session List */}
      {sessions.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl p-6 space-y-3">
          <History className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-400">Belum Ada Sesi Scraper Tersimpan</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Setiap kali Anda menganalisis website baru, sesi scraper akan tersimpan di sini secara otomatis.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessions.map((session) => {
            const isActive = session.id === activeSessionId;
            const dateStr = new Date(session.timestamp).toLocaleString('id-ID', {
              dateStyle: 'medium',
              timeStyle: 'short',
            });

            return (
              <div
                key={session.id}
                className={`bg-slate-950 border rounded-2xl p-5 shadow-lg transition-all space-y-4 flex flex-col justify-between ${
                  isActive
                    ? 'border-cyan-500 ring-1 ring-cyan-500/50 bg-slate-900/80'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400 flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-cyan-400" />
                      <span>{dateStr}</span>
                    </span>

                    <button
                      onClick={() => onDeleteSession(session.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                      title="Hapus sesi ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3 className="text-sm font-bold text-white line-clamp-1">{session.title}</h3>

                  <div className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 font-mono text-xs text-cyan-300 truncate">
                    {session.targetUrl || 'Custom Scraper Request'}
                  </div>

                  {session.refactorHistory && session.refactorHistory.length > 0 && (
                    <div className="text-[11px] text-amber-400/90 font-medium flex items-center space-x-1">
                      <Sparkles className="w-3 h-3" />
                      <span>Direfaktor {session.refactorHistory.length}x</span>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => onSelectSession(session)}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                      isActive
                        ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                        : 'bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-200 border border-slate-700'
                    }`}
                  >
                    <span>{isActive ? 'Sesi Sedang Aktif' : 'Buka & Jalankan Sesi Ini'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
