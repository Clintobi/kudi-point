import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

const hmrHost = process.env.VITE_HMR_HOST

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 43173,
    host: true,
    hmr: hmrHost ? { host: hmrHost, protocol: 'ws', clientPort: 43173 } : undefined,
  },
})
