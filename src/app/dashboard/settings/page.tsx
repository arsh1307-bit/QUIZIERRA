'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { Skeleton } from '@/components/ui/skeleton';
import type { UserProfile } from '@/lib/types';
import { GraduationCap, Pencil } from 'lucide-react';
import { 
  EducationalLevelDialog, 
  educationalLevelOptions, 
  getYearOptions 
} from '@/components/dashboards/educational-level-dialog';

const formSchema = z.object({
  displayName: z.string().min(2, { message: 'Display name must be at least 2 characters.' }),
  email: z.string().email(),
});

function SettingsForm() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: '',
      email: '',
    },
  });
  
  const { formState: { isDirty } } = form;

  useEffect(() => {
    if (userProfile) {
      form.reset({
        displayName: userProfile.displayName || '',
        email: userProfile.email || '',
      });
    }
  }, [userProfile, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user || !firestore || !userProfile) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to update settings.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const userDocRef = doc(firestore, 'users', user.uid);
      
      const updates: Partial<UserProfile> = {};
      
      if (values.displayName !== userProfile.displayName) {
        updates.displayName = values.displayName;
      }

      if (Object.keys(updates).length > 0) {
         // Update Firestore document
        await updateDoc(userDocRef, updates);

        // Update auth profile if display name changed
        if (updates.displayName) {
          await updateProfile(user, { displayName: updates.displayName });
        }
      }

      toast({
        title: 'Settings Saved',
        description: 'Your profile has been updated successfully.',
      });
      form.reset(values); // Resets form's dirty state
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: error.message || 'Could not save settings.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isProfileLoading || !userProfile) {
    return (
        <Card className="max-w-2xl">
            <CardHeader>
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <Skeleton className="h-10 w-32" />
            </CardContent>
        </Card>
    );
  }

  return (
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Manage your account settings and preferences.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="your@email.com" {...field} disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel>Role</FormLabel>
                <Input value={userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1)} disabled />
              </FormItem>
              
              <Button type="submit" disabled={isSaving || !isDirty}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
  );
}

// Educational Settings Card for Students
function EducationalSettingsCard() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [showDialog, setShowDialog] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading } = useDoc<UserProfile>(userProfileRef);

  // Only show for students
  if (isLoading) {
    return (
      <Card className="max-w-2xl mt-6">
        <CardHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!userProfile || userProfile.role !== 'student') {
    return null;
  }

  const levelLabel = userProfile.educationalLevel
    ? educationalLevelOptions.find(o => o.value === userProfile.educationalLevel)?.label
    : 'Not set';

  const yearOptions = getYearOptions(userProfile.educationalLevel);
  const yearLabel = userProfile.educationalYear
    ? yearOptions.find(o => o.value === userProfile.educationalYear)?.label
    : 'Not set';

  return (
    <>
      <EducationalLevelDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        initialValues={{
          educationalLevel: userProfile.educationalLevel,
          educationalYear: userProfile.educationalYear,
        }}
      />
      
      <Card className="max-w-2xl mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Educational Preferences
          </CardTitle>
          <CardDescription>
            Your educational background helps us personalize your learning experience.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Educational Level</p>
              <p className="text-sm font-semibold">{levelLabel}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                {userProfile.educationalLevel === 'middle_school' || userProfile.educationalLevel === 'high_school'
                  ? 'Grade'
                  : userProfile.educationalLevel === 'junior_college'
                  ? 'Standard'
                  : 'Year'}
              </p>
              <p className="text-sm font-semibold">{yearLabel}</p>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            onClick={() => setShowDialog(true)}
            className="w-full"
          >
            <Pencil className="h-4 w-4 mr-2" />
            Edit Educational Preferences
          </Button>
        </CardContent>
      </Card>
    </>
  );
}

export default function SettingsPage() {
    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold tracking-tight mb-8">Settings</h1>
            <SettingsForm />
            <EducationalSettingsCard />
        </div>
    )
}
