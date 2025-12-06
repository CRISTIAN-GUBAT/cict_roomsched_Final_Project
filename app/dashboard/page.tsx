'use client'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import AdminDashboard from '@/components/dashboard/AdminDashboard'
import InstructorDashboard from '@/components/dashboard/InstructorDashboard'
import StudentDashboard from '@/components/dashboard/StudentDashboard'

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  switch (user.role) {
    case 'admin':
      return <AdminDashboard />
    case 'instructor':
      return <InstructorDashboard />
    case 'student':
      return <StudentDashboard />
    default:
      return <div>Invalid user role</div>
  }
}