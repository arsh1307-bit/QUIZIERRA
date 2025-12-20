'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { UserProfile } from '@/lib/types';
import { doc } from 'firebase/firestore';

import { Header } from '@/components/layout/header';
import { Skeleton } from '../ui/skeleton';


function DashboardLayoutSkeleton() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header isDashboard={true} />
      <div className="flex flex-1">
        <main className="flex-1 overflow-x-hidden p-8">
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
        </main>
      </div>
    </div>
  )
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
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
    return <DashboardLayoutSkeleton />;
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header isDashboard={true} userRole={userProfile.role} />
      <div className="flex flex-1">
        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
