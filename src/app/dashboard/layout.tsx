'use client';
import { Header } from '@/components/layout/header';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

function DashboardSkeleton() {
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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  
  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  if (isUserLoading || isProfileLoading || !userProfile) {
    return <DashboardSkeleton />;
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
