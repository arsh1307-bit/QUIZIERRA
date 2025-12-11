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
import { useToast } from '@/hooks/use-toast';
import {
  getAuth,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Briefcase, Shield } from 'lucide-react';
import type { UserRole } from '@/lib/types';


const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

const demoUsers: { role: UserRole; icon: JSX.Element; email: string; password: string, displayName: string }[] = [
  {
    role: 'student',
    icon: <User className="h-5 w-5 text-primary" />,
    email: 'student@example.com',
    password: 'password123',
    displayName: 'Demo Student'
  },
  {
    role: 'instructor',
    icon: <Briefcase className="h-5 w-5 text-primary" />,
    email: 'instructor@example.com',
    password: 'password123',
    displayName: 'Demo Instructor'
  },
];

export default function LoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    const auth = getAuth();
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      router.push('/dashboard');
      toast({
        title: 'Login Successful',
        description: "Welcome back!",
      });
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    const auth = getAuth();
    const db = getFirestore();
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

       await setDoc(doc(db, "users", user.uid), {
        id: user.uid,
        email: user.email,
        displayName: user.displayName,
        createdAt: new Date().toISOString(),
        role: 'student' // Default role
      }, { merge: true });

      router.push('/dashboard');
      toast({
        title: 'Login Successful',
        description: "Welcome!",
      });
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Google Sign-In Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleDemoLogin = async (demoUser: (typeof demoUsers)[0]) => {
    setIsLoading(true);
    const auth = getAuth();
    const db = getFirestore();

    try {
      // First, try to sign in.
      await signInWithEmailAndPassword(auth, demoUser.email, demoUser.password);
      router.push('/dashboard');
      toast({ title: 'Login Successful', description: `Welcome back, ${demoUser.displayName}!` });
    } catch (error: any) {
      // If the error is that the user doesn't exist, create it.
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, demoUser.email, demoUser.password);
          const newUser = userCredential.user;

          // Create user profile in Firestore
          await setDoc(doc(db, "users", newUser.uid), {
            id: newUser.uid,
            email: newUser.email,
            displayName: demoUser.displayName,
            createdAt: new Date().toISOString(),
            role: demoUser.role
          });

          // Now sign in the newly created user
          await signInWithEmailAndPassword(auth, demoUser.email, demoUser.password);

          router.push('/dashboard');
          toast({ title: 'Demo Account Created', description: `Logged in as ${demoUser.displayName}!` });

        } catch (creationError: any) {
          console.error("Demo user creation failed:", creationError);
          toast({
            variant: 'destructive',
            title: 'Demo Login Failed',
            description: creationError.message || 'Could not create demo account.',
          });
        }
      } else {
        // Handle other login errors
        console.error("Login failed:", error);
        toast({
          variant: 'destructive',
          title: 'Login Failed',
          description: error.message || 'An unexpected error occurred.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isUserLoading || user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] w-full items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome Back
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your credentials or use a demo account.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Demo Accounts</CardTitle>
            <CardDescription>Click to log in as a demo user.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {demoUsers.map((demoUser) => (
              <Button
                key={demoUser.role}
                variant="outline"
                onClick={() => handleDemoLogin(demoUser)}
                disabled={isLoading}
              >
                {demoUser.icon}
                {demoUser.role.charAt(0).toUpperCase() + demoUser.role.slice(1)}
              </Button>
            ))}
          </CardContent>
        </Card>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or sign in with email
            </span>
          </div>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="name@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Password</FormLabel>
                    <Link href="/forgot-password" passHref className='text-sm font-medium text-primary hover:underline'>
                        Forgot password?
                    </Link>
                  </div>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>
        </Form>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>
        <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isGoogleLoading || isLoading}>
          {isGoogleLoading ? (
            'Signing In...'
          ) : (
            <>
              <svg role="img" viewBox="0 0 24 24" className="mr-2 h-4 w-4"><path fill="currentColor" d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.05 1.05-2.36 1.67-4.66 1.67-3.86 0-6.99-3.14-6.99-7s3.13-7 6.99-7c2.08 0 3.61.79 4.6 1.7l2.1-2.08C18.49.89 15.86 0 12.48 0 5.86 0 .02 5.86.02 12.5s5.84 12.5 12.46 12.5c6.94 0 11.7-4.73 11.7-12.27 0-.79-.08-1.54-.2-2.31h-11.5z"></path></svg>
              Google
            </>
          )}
        </Button>
        <p className="px-8 text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link href="/signup" passHref className='font-medium text-primary hover:underline'>
                Sign up
            </Link>
        </p>
      </div>
    </div>
  );
}
