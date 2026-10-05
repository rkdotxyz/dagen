import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// drawably's own styles and its pen font come FIRST, so that index.css,
// loaded after them, can override anything it needs to: later CSS wins
// when two rules are equally specific.
import 'drawably/style.css'
import 'drawably/font.css'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
