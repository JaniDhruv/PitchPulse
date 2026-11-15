import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';

// Dynamically locate local .env without hardcoding secrets
const resolveEnvApiKey = () => {
  const currentDir = import.meta.dirname || process.cwd();
  const candidateDirs = [
    process.cwd(),
    path.join(process.cwd(), 'PitchPulse'),
    currentDir,
    path.join(currentDir, '..'),
    path.join(currentDir, '..', '..'),
  ];

  for (const dir of candidateDirs) {
    try {
      const envPath = path.resolve(dir, '.env');
      if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        const rawContent = fs.readFileSync(envPath, 'utf-8');
        const lines = rawContent.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('SMARTSPECTRA_API_KEY=')) {
            const rawVal = trimmed
              .slice('SMARTSPECTRA_API_KEY='.length)
              .trim()
              .replace(/^["']|["']$/g, '');
            if (rawVal.length > 5) {
              return rawVal;
            }
          }
        }
      }
    } catch {}
  }
  return process.env.SMARTSPECTRA_API_KEY || '';
};

const envApiKey = resolveEnvApiKey();

// https://vitejs.dev/config
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    'import.meta.env.VITE_SMARTSPECTRA_API_KEY': JSON.stringify(envApiKey),
  },
});
