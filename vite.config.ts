import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

// HTTPS is needed for WebXR and camera access when testing on a phone or headset over the LAN.
// Run `npm run dev:https` for that; plain `npm run dev` is fine on localhost.
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), ...(mode === 'https' ? [basicSsl()] : [])],
  server: { host: true, port: 5173 },
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: (id: string) => (id.includes('node_modules/three/') ? 'three' : id.includes('node_modules/@react-three/') ? 'r3f' : undefined),
      },
    },
  },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
}))
