import React, { useEffect, useState, useMemo } from 'react';
import {
  ArrowLeft,
  Trash2,
  Calendar,
  Clock,
  Activity,
  Sparkles,
} from 'lucide-react';

export default function HistoryScreen({ onBack, onSelectSession }) {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setIsLoading(true);
    if (window.pitchPulseAPI) {
      const data = await window.pitchPulseAPI.loadSessions();
      setSessions(data || []);
    }
    setIsLoading(false);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.pitchPulseAPI) {
      await window.pitchPulseAPI.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    }
  };

  // Compute longitudinal statistics
  const stats = useMemo(() => {
    if (sessions.length === 0) return null;
    const scores = sessions.map((s) => s.summary?.overallScore || 0);
    const avgScore = Math.round(
      scores.reduce((a, b) => a + b, 0) / scores.length,
    );
    const maxScore = Math.max(...scores);
    const totalPracticeMinutes = Math.round(
      sessions.reduce((acc, s) => acc + (s.summary?.durationSec || 0), 0) / 60,
    );

    return {
      total: sessions.length,
      avgScore,
      maxScore,
      totalPracticeMinutes,
    };
  }, [sessions]);

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 max-w-5xl mx-auto w-full space-y-5 overflow-y-auto select-none animate-fadeIn">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Studio</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Session History & Trajectory
          </span>
        </div>
      </div>

      {/* Aggregate Stats Banner */}
      {stats && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-indigo-950/50 border border-slate-800/80 shadow-xl grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Sessions
            </span>
            <span className="text-xl font-black font-mono text-slate-100 mt-0.5">
              {stats.total}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Average Score
            </span>
            <span className="text-xl font-black font-mono text-sky-400 mt-0.5">
              {stats.avgScore} pts
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Personal Best
            </span>
            <span className="text-xl font-black font-mono text-emerald-400 mt-0.5">
              {stats.maxScore} pts
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Practice Time
            </span>
            <span className="text-xl font-black font-mono text-indigo-400 mt-0.5">
              {stats.totalPracticeMinutes} min
            </span>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center p-16 text-slate-500 text-xs font-mono">
          Loading recorded flight telemetry...
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-center bg-slate-900/80 border border-slate-800 rounded-3xl shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-400 mb-3">
            <Activity className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-200">
            No Past Sessions Recorded Yet
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
            Hit "Record Practice Pitch" in the studio to record your pitch,
            calibrate your biometrics, and view synchronized flight logs.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((sess) => {
            const dateStr = new Date(
              sess.timestamp || sess.id,
            ).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });
            const score = sess.summary?.overallScore || 80;
            const grade = sess.summary?.grade || 'B';
            const duration = sess.summary?.durationSec || 30;
            const avgPulse = sess.summary?.avgPulse || 72;
            const hasGhost = Boolean(sess.ghostComparison);

            return (
              <div
                key={sess.id}
                onClick={() => onSelectSession(sess)}
                className="flex items-center justify-between p-4 rounded-2xl bg-slate-900 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-850 transition-all cursor-pointer shadow-lg hover:shadow-xl group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-400/30 flex flex-col items-center justify-center group-hover:border-sky-400/60 transition-colors">
                    <span className="text-xl font-black font-mono text-sky-400">
                      {score}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      PTS
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-100">
                        Biometric Practice Flight
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {grade}
                      </span>
                      {hasGhost && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" /> Ghost Take
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />{' '}
                        {dateStr}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" /> {duration}s
                      </span>
                      <span className="flex items-center gap-1 text-rose-300">
                        ♥ {avgPulse} BPM
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => handleDelete(e, sess.id)}
                    className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-950/40 transition-colors cursor-pointer"
                    title="Delete session"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
