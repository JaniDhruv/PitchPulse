import React, { useState } from 'react';
import { ShieldCheck, Camera, HardDrive, Key, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { CONSENT_POLICY } from '../lib/constants';

export default function ConsentScreen({ onAccept, savedApiKey = '' }) {
  const [apiKey, setApiKey] = useState(savedApiKey);
  const [hasAgreed, setHasAgreed] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);

  const handleStart = async () => {
    if (!hasAgreed) return;
    if (apiKey && apiKey !== savedApiKey && window.pitchPulseAPI) {
      setIsSavingKey(true);
      await window.pitchPulseAPI.saveApiKey(apiKey);
      setIsSavingKey(false);
    }
    onAccept(apiKey);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 overflow-y-auto">
      <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 md:p-8 text-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Camera Consent & Data Handling</h1>
            <p className="text-xs text-slate-400">PitchPulse Privacy & Responsible Sensing Architecture</p>
          </div>
        </div>

        {/* Informational Cards */}
        <div className="space-y-3.5 mb-6 text-xs text-slate-300">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <Camera className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-200 block mb-0.5">100% Local Frame Processing</span>
              <p className="text-slate-400 leading-relaxed">{CONSENT_POLICY.cameraUsage}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <HardDrive className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-200 block mb-0.5">Local Metric Telemetry Only</span>
              <p className="text-slate-400 leading-relaxed">{CONSENT_POLICY.dataRetention}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-200 block mb-0.5">Non-Medical Educational Wellness Scope</span>
              <p className="text-slate-400 leading-relaxed">{CONSENT_POLICY.disclaimer}</p>
            </div>
          </div>
        </div>

        {/* SmartSpectra API Key Input */}
        <div className="mb-6 p-4 rounded-xl bg-slate-950/80 border border-slate-800">
          <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-sky-400" />
              SmartSpectra API Key
            </span>
            <a
              href="https://physiology.presagetech.com/auth/register"
              target="_blank"
              rel="noreferrer"
              className="text-sky-400 hover:text-sky-300 text-[11px] underline"
            >
              Get Free Trial Key →
            </a>
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Paste your Presage SmartSpectra API key here"
            className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-sky-500 transition-colors"
          />
          <p className="text-[11px] text-slate-500 mt-1.5">
            Your key stays local on your machine and is loaded by the native SDK runtime.
          </p>
        </div>

        {/* Consent Checkbox */}
        <div className="flex items-start gap-3 mb-6 p-3 rounded-lg hover:bg-slate-800/40 cursor-pointer" onClick={() => setHasAgreed(!hasAgreed)}>
          <input
            type="checkbox"
            checked={hasAgreed}
            onChange={(e) => setHasAgreed(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded text-sky-500 bg-slate-800 border-slate-700 focus:ring-0 cursor-pointer"
          />
          <span className="text-xs text-slate-300 select-none leading-relaxed">
            I consent to standard camera vital-signal sensing for practice presentation coaching. I understand that all processing occurs on-device and is not medical monitoring.
          </span>
        </div>

        {/* Action Button */}
        <div className="flex justify-end">
          <button
            disabled={!hasAgreed}
            onClick={handleStart}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg ${
              hasAgreed
                ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white hover:opacity-95 shadow-sky-500/25 cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
            }`}
          >
            <span>Proceed to Studio</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

