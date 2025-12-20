'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { StudentDashboard } from '@/components/dashboards/student-dashboard';
import { InstructorDashboard } from '@/components/dashboards/instructor-dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function AdminDashboard() {
  return (
      <div className="p-8">
          <h1 className="text-3xl font-bold tracking-tight mb-8">Admin Dashboard</h1>
          <Card>
              <CardHeader>
                  <CardTitle>Welcome, Admin!</CardTitle>
              </CardHeader>
              <CardContent>
                  <p>This is the placeholder for the Admin Dashboard. More features coming soon!</p>
              </CardContent>
          </Card>
      </div>
  )
}

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || isProfileLoading || !userProfile) {
    return (
        <div className="p-8">
            <div className="mb-8">
                <Skeleton className="h-10 w-1/3" />
            </div>
            <div className="grid gap-8 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <Skeleton className="h-48 w-full" />
                </div>
                <div className="lg:col-span-1">
                    <Skeleton className="h-48 w-full" />
                </div>
                <div className="lg:col-span-3">
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        </div>
    );
  }

  const renderDashboardByRole = () => {
    switch (userProfile.role) {
      case 'student':
        return <StudentDashboard />;
      case 'instructor':
        return <InstructorDashboard />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return <div>Unknown role. Please contact support.</div>;
    }
  }

  return <>{renderDashboardByRole()}</>;
}
