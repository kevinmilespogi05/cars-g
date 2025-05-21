import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import App from './App.tsx'
import './index.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import { registerSW } from 'virtual:pwa-register'
import { queryClient } from './lib/queryClient'
import { performanceMonitor } from './lib/performance'

// Initialize performance monitoring
performanceMonitor;

// Register service worker
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New content available. Reload?')) {
      updateSW()
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline')
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>,
)
