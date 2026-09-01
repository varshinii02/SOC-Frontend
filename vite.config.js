import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/SOC-Frontend/',
  server: {
    watch: {
      ignored: ['**/public/fight.yaml'],
    },
  },
})