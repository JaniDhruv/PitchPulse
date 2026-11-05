import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    rollupOptions: {
      external: [
        'koffi',
        '@smartspectra/node-sdk',
        '@smartspectra/node-sdk/main',
        '@smartspectra/node-sdk/messages',
        'electron',
      ],
    },
  },
});
