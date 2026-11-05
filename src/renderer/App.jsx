import React, { useState, useEffect } from 'react';
import ConsentScreen from './views/ConsentScreen';
import SessionScreen from './views/SessionScreen';
import ReplayScreen from './views/ReplayScreen';
import HistoryScreen from './views/HistoryScreen';

export default function App() {
  const [hasConsented, setHasConsented] = useState(() => {
    return localStorage.getItem('pitchpulse_consent') === 'true';
  });
  const [apiKey, setApiKey] = useState('');
  const [currentView, setCurrentView] = useState('studio'); // 'studio' | 'replay' | 'history'
  const [activeSession, setActiveSession] = useState(null);

  useEffect(() => {
    async function loadKey() {
      if (window.pitchPulseAPI) {
        const key = await window.pitchPulseAPI.getApiKey();
        if (key) setApiKey(key);
      }
    }
    loadKey();
  }, []);

  const handleConsentAccept = (key) => {
    localStorage.setItem('pitchpulse_consent', 'true');
    setHasConsented(true);
    if (key) setApiKey(key);
  };

  const handleFinishSession = (sessionData) => {
    setActiveSession(sessionData);
    setCurrentView('replay');
  };

  const handleSelectHistorySession = (sessionData) => {
    setActiveSession(sessionData);
    setCurrentView('replay');
  };

  return (
    <div className="w-screen h-screen bg-[#0b0f19] text-slate-100 flex flex-col overflow-hidden font-sans antialiased">
      {!hasConsented && (
        <ConsentScreen
          onAccept={handleConsentAccept}
          savedApiKey={apiKey}
        />
      )}

      {currentView === 'studio' && (
        <SessionScreen
          apiKey={apiKey}
          onFinishSession={handleFinishSession}
          onOpenHistory={() => setCurrentView('history')}
          onOpenSettings={() => setHasConsented(false)}
        />
      )}

      {currentView === 'replay' && (
        <ReplayScreen
          sessionData={activeSession}
          onBackToStudio={() => setCurrentView('studio')}
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

