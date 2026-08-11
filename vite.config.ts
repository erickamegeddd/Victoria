import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    '__BUILD_V__': JSON.stringify('v', 3)
  }
})
