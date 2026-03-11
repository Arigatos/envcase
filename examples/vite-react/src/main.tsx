import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.js'

// env is validated at module load time — if any required variable is
// missing or invalid, this throws before React even mounts.
import './env.js'

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
)
