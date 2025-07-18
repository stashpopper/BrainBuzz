import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import LogRocket from 'logrocket'

// Add CSS for animations
const style = document.createElement('style')
style.textContent = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fadeIn 0.3s ease-out forwards;
}
`
document.head.appendChild(style)

LogRocket.init('dlafio/brainbuzz',{
  shouldDebugLog :true,
})
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
