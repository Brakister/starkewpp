// app/(dashboard)/layout.tsx
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { SocketProvider } from '@/components/layout/SocketProvider'

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <SocketProvider>
      <div className="flex h-screen bg-[#0f1117] text-white overflow-hidden">
        <Sidebar userRole={session.role} />
        <div className="flex flex-col flex-1 min-w-0">
          <TopBar session={session} />
          <main className="flex-1 overflow-hidden">
            {children}
          </main>
        </div>
      </div>
    </SocketProvider>
  )
}
