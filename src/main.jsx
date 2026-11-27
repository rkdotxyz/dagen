import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Tailwind, the shadcn/ui theme and Dagen's layout, all in one file.
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
