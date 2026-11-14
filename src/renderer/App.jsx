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
  const [apiKey, setApiKey] = useState('');
  const [currentView, setCurrentView] = useState('studio'); // 'studio' | 'reveal' | 'replay' | 'history'
  const [activeSession, setActiveSession] = useState(null);
  const [ghostTake, setGhostTake] = useState(null);

  useEffect(() => {
    async function loadKey() {
      if (window.pitchPulseAPI) {
        const key = await window.pitchPulseAPI.getApiKey();
        if (key) setApiKey(key);
      }
    }
    loadKey();
  }, []);

  const handleConsentAccept = (key, telemetry = false) => {
    localStorage.setItem('pitchpulse_consent', 'true');
    localStorage.setItem('pitchpulse_telemetry', String(telemetry));
    setHasConsented(true);
    if (key) setApiKey(key);
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
    </div>
  );
}
