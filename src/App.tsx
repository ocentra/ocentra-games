import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryProvider } from './providers/QueryProvider'
import { AuthProvider } from './providers/AuthProvider'
import { SolanaWalletProvider } from './services/solana/wallet'
import MainApp from './components/MainApp'
import { LogsQueryPage } from './pages/LogsQueryPage'

function App() {
  return <MainApp />;
}

export default function AppWrapper() {
  return (
    <BrowserRouter>
    <QueryProvider>
      <SolanaWalletProvider>
        <AuthProvider>
            <Routes>
              <Route path="/api/logs/query" element={<LogsQueryPage />} />
              <Route path="/api/logs/stats" element={<LogsQueryPage />} />
              <Route path="/*" element={<App />} />
            </Routes>
        </AuthProvider>
      </SolanaWalletProvider>
    </QueryProvider>
    </BrowserRouter>
  )
}