import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
// @ts-ignore - virtual module provided by vite-plugin-pwa
import { registerSW } from 'virtual:pwa-register'

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

const root = createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
