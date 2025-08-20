import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import { Analytics } from '@vercel/analytics/react'
import { BrowserRouter } from 'react-router-dom'

const root = createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Analytics debug={false} />
    </BrowserRouter>
  </React.StrictMode>
)
