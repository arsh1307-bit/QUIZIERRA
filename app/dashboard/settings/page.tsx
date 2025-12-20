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
<<<<<<< HEAD
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { Skeleton } from '@/components/ui/skeleton';
import type { UserProfile } from '@/lib/types';
=======
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { Skeleton } from '@/components/ui/skeleton';
import type { UserProfile, UserPreferences } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
>>>>>>> aac9a39ab4330529467a62387a99c804cd32ffbe

const formSchema = z.object({
  displayName: z.string().min(2, { message: 'Display name must be at least 2 characters.' }),
  email: z.string().email(),
});

<<<<<<< HEAD
=======
const preferencesSchema = z.object({
  defaultDifficulty: z.enum(['easy', 'medium', 'hard']),
  defaultQuizLength: z.coerce.number().min(1).max(50),
});

>>>>>>> aac9a39ab4330529467a62387a99c804cd32ffbe
function SettingsForm() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

<<<<<<< HEAD
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
=======
  const preferencesRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'userPreferences', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  const { data: preferences, isLoading: isPreferencesLoading } = useDoc<UserPreferences>(preferencesRef);
>>>>>>> aac9a39ab4330529467a62387a99c804cd32ffbe

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: '',
      email: '',
    },
  });
<<<<<<< HEAD
=======

  const preferencesForm = useForm<z.infer<typeof preferencesSchema>>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      defaultDifficulty: 'medium',
      defaultQuizLength: 10,
    },
  });
>>>>>>> aac9a39ab4330529467a62387a99c804cd32ffbe
  
  const { formState: { isDirty } } = form;

  useEffect(() => {
    if (userProfile) {
      form.reset({
        displayName: userProfile.displayName || '',
        email: userProfile.email || '',
      });
    }
  }, [userProfile, form]);

<<<<<<< HEAD
=======
  useEffect(() => {
    if (preferences) {
      preferencesForm.reset({
        defaultDifficulty: preferences.defaultDifficulty || 'medium',
        defaultQuizLength: preferences.defaultQuizLength || 10,
      });
    }
  }, [preferences, preferencesForm]);

>>>>>>> aac9a39ab4330529467a62387a99c804cd32ffbe
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

<<<<<<< HEAD
  if (isProfileLoading || !userProfile) {
=======
  const onPreferencesSubmit = async (values: z.infer<typeof preferencesSchema>) => {
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to update preferences.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const prefsRef = doc(firestore, 'userPreferences', user.uid);
      await setDoc(prefsRef, {
        userId: user.uid,
        ...values,
      }, { merge: true });

      toast({
        title: 'Preferences Saved',
        description: 'Your quiz preferences have been updated.',
      });
      preferencesForm.reset(values);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Could not save preferences.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isProfileLoading || isPreferencesLoading || !userProfile) {
>>>>>>> aac9a39ab4330529467a62387a99c804cd32ffbe
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

<<<<<<< HEAD
export default function SettingsPage() {
    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold tracking-tight mb-8">Settings</h1>
            <SettingsForm />
=======
function QuizPreferencesForm() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const preferencesRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'userPreferences', user.uid);
  }, [user, firestore]);

  const { data: preferences, isLoading } = useDoc<UserPreferences>(preferencesRef);

  const preferencesForm = useForm<z.infer<typeof preferencesSchema>>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      defaultDifficulty: 'medium',
      defaultQuizLength: 10,
    },
  });

  useEffect(() => {
    if (preferences) {
      preferencesForm.reset({
        defaultDifficulty: preferences.defaultDifficulty || 'medium',
        defaultQuizLength: preferences.defaultQuizLength || 10,
      });
    }
  }, [preferences, preferencesForm]);

  const onSubmit = async (values: z.infer<typeof preferencesSchema>) => {
    if (!user || !firestore) return;

    setIsSaving(true);
    try {
      const prefsRef = doc(firestore, 'userPreferences', user.uid);
      await setDoc(prefsRef, {
        userId: user.uid,
        ...values,
      }, { merge: true });

      toast({
        title: 'Preferences Saved',
        description: 'Your quiz preferences have been updated.',
      });
      preferencesForm.reset(values);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Could not save preferences.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="max-w-2xl">
        <CardHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Quiz Preferences</CardTitle>
        <CardDescription>Customize your default quiz settings</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...preferencesForm}>
          <form onSubmit={preferencesForm.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={preferencesForm.control}
              name="defaultDifficulty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Difficulty</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={preferencesForm.control}
              name="defaultQuizLength"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Quiz Length</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} max={50} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isSaving || !preferencesForm.formState.isDirty}>
              {isSaving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
    return (
        <div className="p-8 space-y-8">
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <SettingsForm />
            <QuizPreferencesForm />
>>>>>>> aac9a39ab4330529467a62387a99c804cd32ffbe
        </div>
    )
}
