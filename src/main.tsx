import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import { Analytics } from '@vercel/analytics/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/dev-sw.js?dev-sw', {
        scope: '/'
      });
      console.log('Service Worker registered successfully:', registration.scope);
      
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('Service Worker update found!');
        
        newWorker?.addEventListener('statechange', () => {
          console.log('Service Worker state changed:', newWorker.state);
        });
      });
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  });
}

const root = createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Analytics debug={false} />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
