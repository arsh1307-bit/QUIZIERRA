'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, updateDoc } from 'firebase/firestore';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile, EducationalLevel } from '@/lib/types';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { GraduationCap, Loader2 } from 'lucide-react';

// Educational level options with labels
export const educationalLevelOptions: { value: EducationalLevel; label: string }[] = [
  { value: 'middle_school', label: 'Middle School' },
  { value: 'high_school', label: 'High School' },
  { value: 'junior_college', label: 'Junior College' },
  { value: 'diploma', label: 'Diploma' },
  { value: 'graduation', label: 'Graduation (Bachelor\'s)' },
  { value: 'post_graduation', label: 'Post Graduation (Master\'s/PhD)' },
];

// Year options based on educational level
export const getYearOptions = (level: EducationalLevel | undefined): { value: string; label: string }[] => {
  switch (level) {
    case 'middle_school':
      return [
        { value: '6', label: 'Grade 6' },
        { value: '7', label: 'Grade 7' },
        { value: '8', label: 'Grade 8' },
      ];
    case 'high_school':
      return [
        { value: '9', label: 'Grade 9 (Freshman)' },
        { value: '10', label: 'Grade 10 (Sophomore)' },
        { value: '11', label: 'Grade 11 (Junior)' },
        { value: '12', label: 'Grade 12 (Senior)' },
      ];
    case 'junior_college':
      return [
        { value: '11', label: '11th Standard' },
        { value: '12', label: '12th Standard' },
      ];
    case 'diploma':
      return [
        { value: '1', label: '1st Year' },
        { value: '2', label: '2nd Year' },
        { value: '3', label: '3rd Year' },
      ];
    case 'graduation':
      return [
        { value: '1', label: '1st Year' },
        { value: '2', label: '2nd Year' },
        { value: '3', label: '3rd Year' },
        { value: '4', label: '4th Year' },
      ];
    case 'post_graduation':
      return [
        { value: '1', label: '1st Year' },
        { value: '2', label: '2nd Year' },
        { value: 'phd', label: 'PhD' },
      ];
    default:
      return [];
  }
};

const formSchema = z.object({
  educationalLevel: z.enum(['middle_school', 'high_school', 'junior_college', 'diploma', 'graduation', 'post_graduation'], {
    required_error: 'Please select your educational level',
  }),
  educationalYear: z.string({
    required_error: 'Please select your year/grade',
  }).min(1, 'Please select your year/grade'),
});

type FormValues = z.infer<typeof formSchema>;

interface EducationalLevelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
  initialValues?: {
    educationalLevel?: EducationalLevel;
    educationalYear?: string;
  };
}

export function EducationalLevelDialog({
  open,
  onOpenChange,
  onSaved,
  initialValues,
}: EducationalLevelDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      educationalLevel: initialValues?.educationalLevel,
      educationalYear: initialValues?.educationalYear || '',
    },
  });

  const selectedLevel = form.watch('educationalLevel');
  const yearOptions = getYearOptions(selectedLevel);

  // Reset year when level changes
  useEffect(() => {
    if (selectedLevel && selectedLevel !== initialValues?.educationalLevel) {
      form.setValue('educationalYear', '');
    }
  }, [selectedLevel, form, initialValues?.educationalLevel]);

  // Update form when initialValues change
  useEffect(() => {
    if (initialValues) {
      form.reset({
        educationalLevel: initialValues.educationalLevel,
        educationalYear: initialValues.educationalYear || '',
      });
    }
  }, [initialValues, form]);

  const onSubmit = async (values: FormValues) => {
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to update your preferences.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const userDocRef = doc(firestore, 'users', user.uid);
      await updateDoc(userDocRef, {
        educationalLevel: values.educationalLevel,
        educationalYear: values.educationalYear,
      });

      toast({
        title: 'Preferences Saved!',
        description: 'Your educational level has been updated successfully.',
      });

      onOpenChange(false);
      onSaved?.();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Educational Preferences
          </DialogTitle>
          <DialogDescription>
            Tell us about your educational background so we can personalize your learning experience.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="educationalLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Educational Level</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your educational level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {educationalLevelOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedLevel && yearOptions.length > 0 && (
              <FormField
                control={form.control}
                name="educationalYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {selectedLevel === 'middle_school' || selectedLevel === 'high_school'
                        ? 'Grade'
                        : selectedLevel === 'junior_college'
                        ? 'Standard'
                        : 'Year'}
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={`Select your ${
                            selectedLevel === 'middle_school' || selectedLevel === 'high_school'
                              ? 'grade'
                              : selectedLevel === 'junior_college'
                              ? 'standard'
                              : 'year'
                          }`} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {yearOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Preferences'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Hook to check if user needs to set educational level
export function useEducationalLevelCheck() {
  const { user } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading } = useDoc<UserProfile>(userProfileRef);

  const needsEducationalLevel = 
    !isLoading && 
    userProfile?.role === 'student' && 
    (!userProfile?.educationalLevel || !userProfile?.educationalYear);

  return {
    userProfile,
    isLoading,
    needsEducationalLevel,
    educationalLevel: userProfile?.educationalLevel,
    educationalYear: userProfile?.educationalYear,
  };
}
