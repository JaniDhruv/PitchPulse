import React, { useEffect, useState } from 'react';
import { ArrowLeft, Trash2, Calendar, Clock, Award, Activity } from 'lucide-react';

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
      setSessions(prev => prev.filter(s => s.id !== id));
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 max-w-4xl mx-auto w-full space-y-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Studio</span>
        </button>
        <h2 className="text-sm font-bold text-slate-200">Session History</h2>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12 text-slate-500 text-xs">
          Loading past sessions...
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-center bg-slate-900 border border-slate-800 rounded-2xl">
          <Activity className="w-10 h-10 text-slate-600 mb-3" />
          <h3 className="text-sm font-semibold text-slate-300">No Past Sessions Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            Hit "Record Pitch" in the studio to record your practice answer and view full biometric telemetry.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((sess) => {
            const dateStr = new Date(sess.timestamp || sess.id).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });
            const score = sess.summary?.overallScore || 80;
            const grade = sess.summary?.grade || 'B';
            const duration = sess.summary?.durationSec || 30;

            return (
              <div
                key={sess.id}
                onClick={() => onSelectSession(sess)}
                className="flex items-center justify-between p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/60 transition-all cursor-pointer shadow-md"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-400/30 flex items-center justify-center">
                    <span className="text-lg font-black font-mono text-sky-400">{score}</span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold text-slate-100">Practice Session</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {grade}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {dateStr}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {duration}s
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => handleDelete(e, sess.id)}
                    className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer"
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

