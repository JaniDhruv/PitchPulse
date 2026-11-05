import '@smartspectra/node-sdk/preload';
import { contextBridge, ipcRenderer } from 'electron';

// Expose safe pitchPulseAPI helper methods to renderer
contextBridge.exposeInMainWorld('pitchPulseAPI', {
  getApiKey: () => ipcRenderer.invoke('pitchpulse:get-api-key'),
  saveApiKey: (key) => ipcRenderer.invoke('pitchpulse:save-api-key', key),
  saveSession: (session) => ipcRenderer.invoke('pitchpulse:save-session', session),
  loadSessions: () => ipcRenderer.invoke('pitchpulse:load-sessions'),
  deleteSession: (id) => ipcRenderer.invoke('pitchpulse:delete-session', id),
  getPlatform: () => process.platform,
});
