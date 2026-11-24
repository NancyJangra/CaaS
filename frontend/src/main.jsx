import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { applyTheme, getStoredTheme, watchSystemTheme } from './utils/theme'
applyTheme(getStoredTheme())
watchSystemTheme()
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
