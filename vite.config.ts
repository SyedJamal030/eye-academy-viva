import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import { cloudflare } from '@cloudflare/vite-plugin'

const config = defineConfig({
  resolve: { tsconfigPaths: true, dedupe: ['react', 'react-dom'] },
  ssr: {
    noExternal: ['react-bootstrap'],
  },
  plugins: [
    devtools(),
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tanstackStart(),
    viteReact(),
  ],
  server: {
    watch: {
      ignored: ['**/.wrangler/**', '**/node_modules/**', '**/dist/**'],
    },
  },
})

export default config
