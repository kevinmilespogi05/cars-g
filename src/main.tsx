import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { BrowserRouter } from 'react-router-dom'

const root = createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)

// Defer heavy, non-critical JS for smoother mobile startup
// Load Bootstrap JS after hydration during idle time
if (typeof window !== 'undefined') {
  const idle = (cb: () => void) =>
    (window as any).requestIdleCallback ? (window as any).requestIdleCallback(cb) : setTimeout(cb, 1500);
  idle(() => {
    import('bootstrap/dist/js/bootstrap.bundle.min.js').catch(() => {});
  });
}
