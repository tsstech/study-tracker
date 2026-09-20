import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' makes the built files work from any sub-path,
// which is what GitHub Pages serves from (username.github.io/repo-name/).
export default defineConfig({
  plugins: [react()],
  base: './'
})
