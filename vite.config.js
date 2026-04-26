import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'ToGoGo — Trade · Swap · Connect · Share',
        short_name: 'ToGoGo',
        description: 'Dropshipping & marketplace platform — buy, sell, swap, and trade products.',
        theme_color: '#FF6B35',
        background_color: '#FAFAFA',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Exclude /api/storefront/* — these include the shuffled
            // featured-products response which the PWA must never
            // cache, otherwise refresh shows the same order every time.
            urlPattern: ({ url }) =>
              /^https:\/\/.*\.togogo\.me\/api\//i.test(url.href) &&
              !url.pathname.startsWith('/api/storefront/'),
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache', expiration: { maxEntries: 50, maxAgeSeconds: 300 } }
          },
          {
            // Storefront API responses always go straight to the
            // network. No cache, no fallback — the shuffle stays fresh.
            urlPattern: ({ url }) =>
              /^https:\/\/.*\.togogo\.me\/api\/storefront\//i.test(url.href),
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/ae-pic.*\.aliexpress-media\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'product-images', expiration: { maxEntries: 500, maxAgeSeconds: 86400 } }
          }
        ]
      }
    })
  ],
  server: { port: 5173, host: true }
})
