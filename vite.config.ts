import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'generateSW',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      devOptions: {
        enabled: false, // Disable service worker in development
        type: 'module'
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,vue,txt,woff2}'],
        cleanupOutdatedCaches: true,
        sourcemap: true,
        // Offline fallback
        navigateFallback: '/offline.html',
        navigateFallbackAllowlist: [/^\/$/],
        runtimeCaching: [
          {
            // Opportunistic map tiles caching (OpenStreetMap)
            urlPattern: /^https:\/\/(?:[a-c])\.tile\.openstreetmap\.org\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'osm-tiles-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/[a-z0-9-]+\.supabase\.co\/auth\/v1/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-auth-cache',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 // 1 day
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/[a-z0-9-]+\.supabase\.co\/rest\/v1/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-storage-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\.(?:css|js)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // API calls with better offline handling
            urlPattern: /^https:\/\/[a-z0-9-]+\.supabase\.co\/rest\/v1\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 1 day
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      manifest: {
        name: 'Bantay SP',
        short_name: 'Bantay SP',
        description: 'San Pablo community reporting system',
        theme_color: '#800000',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        categories: ['productivity', 'utilities', 'business'],
        lang: 'en',
        dir: 'ltr',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        screenshots: [
          {
            src: '/screenshot-wide.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide'
          },
          {
            src: '/screenshot-narrow.png',
            sizes: '750x1334',
            type: 'image/png',
            form_factor: 'narrow'
          }
        ],
        prefer_related_applications: false,
        edge_side_panel: {
          preferred_width: 400
        },
        launch_handler: {
          client_mode: 'navigate-existing'
        }
      }
    })
  ],
  build: {
    sourcemap: true,
    target: 'esnext',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'router-vendor': ['react-router-dom'],
          'ui-vendor': ['framer-motion', 'lucide-react'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'socket-vendor': ['socket.io-client'],
          'firebase-vendor': ['firebase/app', 'firebase/messaging'],
          'map-vendor': ['leaflet', 'react-leaflet'],
          'chart-vendor': ['chart.js', 'react-chartjs-2'],
          'date-vendor': ['date-fns'],
          'utils-vendor': ['zustand'],
          // App chunks
          'auth': [
            './src/store/authStore.ts',
            './src/lib/jwt.ts',
            './src/lib/supabase.ts'
          ],
          'services': [
            './src/services/adminService.ts',
            './src/services/reportsService.ts',
            './src/services/commentsService.ts',
            './src/services/activityService.ts'
          ],
          'components-admin': [
            './src/components/AdminChatInterface.tsx',
            './src/components/AnnouncementManagement.tsx',
            './src/components/UserManagement.tsx',
            './src/components/AvatarSelector.tsx'
          ],
          'components-chat': [
            './src/components/ChatWindow.tsx'
          ],
          'lib-utils': [
            './src/lib/config.ts',
            './src/lib/cloudinaryStorage.ts',
            './src/lib/firebase.ts',
            './src/lib/socket.ts'
          ]
        }
      }
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    host: true, // Allow external connections
    allowedHosts: ['cars-g.onrender.com', 'localhost', '127.0.0.1'],
    hmr: {
      port: 5173,
      host: 'localhost'
    },
    proxy: {
      '/api': {
        target: process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : 'https://cars-g-api.onrender.com',
        changeOrigin: true,
        secure: process.env.NODE_ENV !== 'development',
        rewrite: (path) => path
      },
      '/socket.io': {
        target: process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : 'https://cars-g-api.onrender.com',
        changeOrigin: true,
        secure: process.env.NODE_ENV !== 'development',
        ws: true
      }
    }
  },
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react-router-dom',
      'framer-motion',
      'lucide-react',
      '@supabase/supabase-js',
      'socket.io-client',
      'firebase/app',
      'firebase/messaging',
      'leaflet',
      'react-leaflet',
      'chart.js',
      'react-chartjs-2',
      'date-fns',
      'zustand'
    ],
    esbuildOptions: {
      target: 'es2020'
    }
  },
  resolve: {
    alias: {
      'react': 'react',
      'react-dom': 'react-dom'
    }
  }
});
