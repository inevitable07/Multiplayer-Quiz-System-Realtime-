import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { UserConfig } from 'vite'

// https://vite.dev/config/
const config: UserConfig = defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
})

export default config
