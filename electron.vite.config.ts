import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

/**
 * Vite plugin: fix renderer HTML for Electron production.
 *
 * Vite emits <script type="module" crossorigin ...> by default.
 * Inside an asar archive, Chromium's ES-module loader cannot resolve
 * file:// URLs through Electron's virtual-fs interception, which causes
 * a silent load failure → white screen.
 *
 * Fix: strip `crossorigin` and replace `type="module"` with `defer`
 * (the bundle is a plain IIFE — no import/export — so classic-script
 * mode is correct; `defer` keeps execution order after DOM parse).
 */
function electronRendererHtmlPlugin(): Plugin {
  return {
    name: 'electron-renderer-html',
    enforce: 'post',
    transformIndexHtml(html) {
      return html
        .replace(/ crossorigin/g, '')
        .replace(/<script type="module"/g, '<script defer')
    }
  }
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ['electron-store'] })]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react(), electronRendererHtmlPlugin()]
  }
})
