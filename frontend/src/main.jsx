import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import { ThemeProvider, useTheme } from './context/ThemeContext.jsx'
import './index.css'

function ThemedToaster() {
  const { isDark } = useTheme()
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        className: '!max-w-[calc(100vw-1.5rem)]',
        style: isDark
          ? { background: '#1a2820', color: '#e8eeea', border: '1px solid #2c4036' }
          : undefined,
      }}
    />
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <ThemedToaster />
      <App />
    </ThemeProvider>
  </StrictMode>,
)
