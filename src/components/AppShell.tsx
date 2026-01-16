import { ReactNode } from 'react'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-bg-primary flex flex-col safe-top">
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  )
}
