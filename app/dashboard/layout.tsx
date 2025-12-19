'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/firebase'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isUserLoading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login')
    }
  }, [user, isUserLoading, router])

  if (isUserLoading || !user) {
    return null // or skeleton
  }

  return <>{children}</>
}
