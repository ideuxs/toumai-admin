import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  root: 'src',      // Si ton code reste dans src
  build: {
    outDir: '../dist',  // Pour que le build sorte à la racine
    emptyOutDir: true,
  },
  base: './',
})
