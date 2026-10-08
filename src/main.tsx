import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import { TRPCProvider } from "@/providers/trpc"
import { AuthProvider } from "@/providers/auth"
import { applyTheme, getStoredTheme } from "@/lib/themes"
import App from './App.tsx'

applyTheme(getStoredTheme());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <TRPCProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </TRPCProvider>
    </BrowserRouter>
  </StrictMode>,
)
