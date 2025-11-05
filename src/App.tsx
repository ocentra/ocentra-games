import React from 'react'
import { QueryProvider } from './providers/QueryProvider'
import { AuthProvider } from './providers/AuthProvider'
import MainApp from './components/MainApp'

function App() {
  return <MainApp />;
}

export default function AppWrapper() {
  return (
    <QueryProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryProvider>
  )
}