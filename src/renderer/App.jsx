import React, { useState, useEffect } from 'react';
import ConsentScreen from './views/ConsentScreen';
import SessionScreen from './views/SessionScreen';
import ScoreRevealScreen from './views/ScoreRevealScreen';
import ReplayScreen from './views/ReplayScreen';
import HistoryScreen from './views/HistoryScreen';

export default function App() {
  const [hasConsented, setHasConsented] = useState(() => {
    return localStorage.getItem('pitchpulse_consent') === 'true';
  });
  const [enableTelemetry, setEnableTelemetry] = useState(() => {
    return localStorage.getItem('pitchpulse_telemetry') === 'true';
  });
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('pitchpulse_api_key') || '';
  });
  const [isKeyLoaded, setIsKeyLoaded] = useState(false);
  const [currentView, setCurrentView] = useState('studio'); // 'studio' | 'reveal' | 'replay' | 'history'
  const [activeSession, setActiveSession] = useState(null);
  const [ghostTake, setGhostTake] = useState(null);

  useEffect(() => {
    async function loadKey() {
      if (window.pitchPulseAPI) {
        try {
          const key = await window.pitchPulseAPI.getApiKey();
          if (key) {
            setApiKey(key);
            localStorage.setItem('pitchpulse_api_key', key);
          }
        } catch (err) {
          console.warn('Failed to load API key from main IPC:', err);
        }
      }
      setIsKeyLoaded(true);
    }
    loadKey();
  }, []);

  const handleConsentAccept = (key, telemetry = false) => {
    localStorage.setItem('pitchpulse_consent', 'true');
    localStorage.setItem('pitchpulse_telemetry', String(telemetry));
    if (key) {
      localStorage.setItem('pitchpulse_api_key', key);
      setApiKey(key);
    }
    setHasConsented(true);
    setEnableTelemetry(telemetry);
  };

  const handleFinishSession = (sessionData) => {
    // If ghost take was active, attach comparison metadata
    if (ghostTake) {
      sessionData.ghostComparison = {
        take1Score: ghostTake.summary?.overallScore || 75,
        take1Pulse: ghostTake.summary?.avgPulse || 88,
        take1EyeContact: ghostTake.summary?.subScores?.eyeContact || 65,
        take1Breath: ghostTake.summary?.avgBreath || 18,
        take1Date: ghostTake.timestamp || Date.now(),
      };
    }
    setActiveSession(sessionData);
    // Trigger cinematic score reveal first
    setCurrentView('reveal');
  };

  const handlePracticeWithGhost = (sessionToGhost) => {
    setGhostTake(sessionToGhost);
    setCurrentView('studio');
  };

  const handleSelectHistorySession = (sessionData) => {
    setActiveSession(sessionData);
    setCurrentView('replay');
  };

  return (
    <div className="w-screen h-screen bg-[#070b14] text-slate-100 flex flex-col overflow-hidden font-sans antialiased">
      {!hasConsented && (
        <ConsentScreen
          onAccept={handleConsentAccept}
          savedApiKey={apiKey}
          initialTelemetry={enableTelemetry}
        />
      )}

      {!isKeyLoaded ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#070b14] text-slate-400 font-mono text-xs space-y-2">
          <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <span>Initializing physiological studio sensors...</span>
        </div>
      ) : (
        <>
          {currentView === 'studio' && (
            <SessionScreen
              apiKey={apiKey}
              enableTelemetry={enableTelemetry}
              ghostTake={ghostTake}
              onClearGhost={() => setGhostTake(null)}
              onFinishSession={handleFinishSession}
              onOpenHistory={() => setCurrentView('history')}
              onOpenSettings={() => setHasConsented(false)}
            />
          )}

          {currentView === 'reveal' && (
            <ScoreRevealScreen
              sessionData={activeSession}
              onContinueToReplay={() => setCurrentView('replay')}
            />
          )}

          {currentView === 'replay' && (
            <ReplayScreen
              sessionData={activeSession}
              onBackToStudio={() => {
                setGhostTake(null);
                setCurrentView('studio');
              }}
              onPracticeWithGhost={handlePracticeWithGhost}
            />
          )}

          {currentView === 'history' && (
            <HistoryScreen
              onBack={() => setCurrentView('studio')}
              onSelectSession={handleSelectHistorySession}
            />
          )}
        </>
      )}
    </div>
  );
}
