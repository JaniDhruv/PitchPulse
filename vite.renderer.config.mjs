import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import dotenv from 'dotenv';
import path from 'node:path';

// Load local .env without hardcoding secrets
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envApiKey = process.env.SMARTSPECTRA_API_KEY || '';

// https://vitejs.dev/config
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    'import.meta.env.VITE_SMARTSPECTRA_API_KEY': JSON.stringify(envApiKey),
  },
});
