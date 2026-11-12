// Review preview bundle: mounted at /typing/ by nce-tool/review_server.py.
// Built into its own directory so the live review build stays untouched until verified.
// publicDir is off: dicts/sounds come from the repo's public/, and lesson MP3s from
// nce-data — neither is copied into the bundle.
import { nceDataPlugin } from './scripts/nce-data-plugin'
import react from '@vitejs/plugin-react'
import { promises as fs } from 'fs'
import path from 'node:path'
import Icons from 'unplugin-icons/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/typing/',
  publicDir: false,
  plugins: [
    react(),
    Icons({
      compiler: 'jsx',
      jsx: 'react',
      customCollections: {
        'my-icons': {
          xiaohongshu: () => fs.readFile('./src/assets/xiaohongshu.svg', 'utf-8'),
        },
      },
    }),
    nceDataPlugin(path.resolve(__dirname, '../nce-tool/nce-data')),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  css: {
    modules: {
      localsConvention: 'camelCaseOnly',
    },
  },
  define: {
    REACT_APP_DEPLOY_ENV: JSON.stringify('review'),
    LATEST_COMMIT_HASH: JSON.stringify('nce-review'),
  },
  build: {
    minify: true,
    sourcemap: false,
    outDir: path.resolve(__dirname, '../nce-tool/out/review-practice-build-official'),
    emptyOutDir: true,
  },
})
