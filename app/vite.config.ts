import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export function createViteConfig() {
  return {
    plugins: [
      // The React and Tailwind plugins are both required for Make, even if
      // Tailwind is not being actively used – do not remove them
      react(),
      tailwindcss(),
      VitePWA({
        // 'prompt' en vez de 'autoUpdate': con autoUpdate, vite-plugin-pwa recarga la página
        // sola y sin avisar en cuanto detecta y activa una versión nueva del service worker —
        // causaba el issue #34 ("la app se refresca sola"). Con 'prompt', la versión nueva se
        // descarga y se queda en espera; main.tsx la expone vía usePwaUpdateStore y
        // PwaUpdateBanner ofrece actualizar, y solo entonces se activa/recarga.
        registerType: 'prompt',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
        workbox: {
          // The HEIC decoder is dynamically imported only when previewing an
          // iPhone HEIC photo, so it shouldn't be eagerly precached for every
          // visitor. Cache it lazily on first use instead.
          globIgnores: ['**/heic-to-*.js'],
          runtimeCaching: [
            {
              urlPattern: /\/assets\/heic-to-.*\.js$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'heic-to-decoder',
                expiration: { maxEntries: 1 }
              }
            }
          ]
        },
        manifest: {
          name: 'El Baúl',
          short_name: 'El Baúl',
          description: 'Tu baúl de recuerdos digitales compartido',
          theme_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],

    resolve: {
      alias: {
        // Alias @ to the src directory
        '@': path.resolve(__dirname, './src'),
      },
    },

    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
    },

    preview: {
      port: 4173,
      strictPort: true,
    },

    build: {
      sourcemap: true
    }
  }
}

export default defineConfig(createViteConfig())
