'use client';

import { motion } from 'framer-motion';
import { Plus, Users, BarChart, BookOpen, TrendingDown, FileText, Activity, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, getDocs, getCountFromServer, orderBy, limit } from 'firebase/firestore';
import { Clock } from 'lucide-react';
import type { Exam, Attempt, Class } from '@/lib/types';
import { useEffect, useState, useMemo } from 'react';
import { Skeleton } from '../ui/skeleton';
import { calculateAnalytics, type ConceptInsight } from '@/lib/analytics';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
    },
  },
};

function OverviewCards() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [stats, setStats] = useState({
        totalStudents: 0,
        activeQuizzes: 0,
        avgClassAccuracy: 0,
        weakestTopic: 'N/A',
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!firestore || !user) return;

        const fetchStats = async () => {
            setIsLoading(true);
            try {
                // Total students across all classes
                const classesQuery = query(collection(firestore, 'classes'), where('createdBy', '==', user.uid));
                const classesSnapshot = await getDocs(classesQuery);
                const allStudentIds = new Set<string>();
                
                classesSnapshot.forEach(doc => {
                    const classData = doc.data() as Class;
                    classData.enrolledStudentIds?.forEach(id => allStudentIds.add(id));
                });

                // Active quizzes
                const activeQuizzesQuery = query(
                    collection(firestore, 'exams'),
                    where('createdBy', '==', user.uid),
                    where('status', '==', 'Live Now')
                );
                const activeQuizzesCount = await getCountFromServer(activeQuizzesQuery);

                // Average accuracy from completed attempts
                const completedAttemptsQuery = query(
                    collection(firestore, 'attempts'),
                    where('status', '==', 'Completed')
                );
                const attemptsSnapshot = await getDocs(completedAttemptsQuery);
                
                let totalAccuracy = 0;
                let count = 0;
                attemptsSnapshot.forEach(doc => {
                    const attempt = doc.data() as Attempt;
                    if (attempt.totalQuestions > 0) {
                        totalAccuracy += (attempt.score / (attempt.totalQuestions * 10)) * 100;
                        count++;
                    }
                });

                const avgAccuracy = count > 0 ? Math.round(totalAccuracy / count) : 0;

                // Weakest topic (simplified - would use concept insights in real implementation)
                const weakestTopic = 'Analyzing...';

                setStats({
                    totalStudents: allStudentIds.size,
                    activeQuizzes: activeQuizzesCount.data().count,
                    avgClassAccuracy: avgAccuracy,
                    weakestTopic,
                });
            } catch (error) {
                console.error("Error fetching stats:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, [firestore, user]);
    
    const statItems = [
        { title: "Total Students", value: stats.totalStudents, icon: Users, color: "text-blue-500" },
        { title: "Active Quizzes", value: stats.activeQuizzes, icon: Activity, color: "text-green-500" },
        { title: "Avg Class Accuracy", value: `${stats.avgClassAccuracy}%`, icon: BarChart, color: "text-purple-500" },
        { title: "Weakest Topic", value: stats.weakestTopic, icon: TrendingDown, color: "text-red-500" },
    ];

    if (isLoading) {
        return (
            <>
                {[...Array(4)].map((_, index) => (
                     <motion.div key={index} className="col-span-12 sm:col-span-6 lg:col-span-3" variants={itemVariants}>
                        <Card className="bg-card/80 backdrop-blur-sm"><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
                     </motion.div>
                ))}
            </>
        )
    }

    return (
        <>
            {statItems.map((stat, index) => (
                <motion.div key={index} className="col-span-12 sm:col-span-6 lg:col-span-3" variants={itemVariants}>
                    <Card className="bg-card/80 backdrop-blur-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                            <stat.icon className={`h-5 w-5 ${stat.color}`} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                        </CardContent>
                    </Card>
                </motion.div>
            ))}
        </>
    );
}

function QuickActions() {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-card/80 backdrop-blur-sm hover:shadow-lg transition-shadow cursor-pointer">
                <Link href="/dashboard/practice">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <FileText className="h-5 w-5 text-primary" />
                            Upload Material
                        </CardTitle>
                        <CardDescription>Upload study materials to generate quizzes</CardDescription>
                    </CardHeader>
                </Link>
            </Card>

            <Card className="bg-card/80 backdrop-blur-sm hover:shadow-lg transition-shadow cursor-pointer">
                <Link href="/dashboard/quizzes/create">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Plus className="h-5 w-5 text-primary" />
                            Create Quiz
                        </CardTitle>
                        <CardDescription>Create a new quiz from scratch or AI</CardDescription>
                    </CardHeader>
                </Link>
            </Card>

            <Card className="bg-card/80 backdrop-blur-sm hover:shadow-lg transition-shadow cursor-pointer">
                <Link href="/dashboard/classes/create">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Users className="h-5 w-5 text-primary" />
                            Create Class
                        </CardTitle>
                        <CardDescription>Set up a new class for students</CardDescription>
                    </CardHeader>
                </Link>
            </Card>

            <Card className="bg-card/80 backdrop-blur-sm hover:shadow-lg transition-shadow cursor-pointer">
                <Link href="/dashboard/analytics">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <BarChart className="h-5 w-5 text-primary" />
                            View Analytics
                        </CardTitle>
                        <CardDescription>Track student performance and insights</CardDescription>
                    </CardHeader>
                </Link>
            </Card>
        </div>
    );
}

export function EnhancedInstructorDashboard() {
  return (
    <motion.div 
        className="grid grid-cols-12 gap-8 p-4 md:p-8"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
    >
        <motion.div className="col-span-12" variants={itemVariants}>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-3xl font-bold tracking-tight">Teacher Dashboard</h1>
                <div className="flex gap-2">
                    <Button variant="outline" asChild>
                        <Link href="/dashboard/classes">
                            <Users className="h-4 w-4 mr-2" />
                            My Classes
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link href="/dashboard/quizzes/create">
                            <Plus className="h-4 w-4 mr-2" />
                            Create Quiz
                        </Link>
                    </Button>
                </div>
            </div>
        </motion.div>

        {/* Overview Cards */}
        <OverviewCards />

        {/* Quick Actions */}
        <motion.div className="col-span-12" variants={itemVariants}>
            <h2 className="text-2xl font-semibold tracking-tight mb-4">Quick Actions</h2>
            <QuickActions />
        </motion.div>

        {/* Recent Classes */}
        <motion.div className="col-span-12 lg:col-span-8" variants={itemVariants}>
            <h2 className="text-2xl font-semibold tracking-tight mb-4">Recent Classes</h2>
            <RecentClassesPreview />
        </motion.div>

        {/* Recent Activity */}
        <motion.div className="col-span-12 lg:col-span-4" variants={itemVariants}>
            <h2 className="text-2xl font-semibold tracking-tight mb-4">Recent Activity</h2>
            <RecentActivityFeed />
        </motion.div>
    </motion.div>
  );
}

function RecentClassesPreview() {
    const { user } = useUser();
    const firestore = useFirestore();

    const classesQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, 'classes'), where('createdBy', '==', user.uid));
    }, [user, firestore]);

    const { data: classes, isLoading } = useCollection<Class>(classesQuery);

    if (isLoading) {
        return <Skeleton className="h-40 w-full" />;
    }

    if (!classes || classes.length === 0) {
        return (
            <Card className="bg-muted/50">
                <CardContent className="p-8 text-center">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">No classes created yet.</p>
                    <Button asChild>
                        <Link href="/dashboard/classes/create">Create Your First Class</Link>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {classes.slice(0, 3).map((classItem) => (
                <Card key={classItem.id} className="bg-card/80 backdrop-blur-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold">{classItem.name}</h3>
                                <p className="text-sm text-muted-foreground">{classItem.subject}</p>
                                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                    <span>{classItem.enrolledStudentIds.length} students</span>
                                    <span>{classItem.assignedQuizIds.length} quizzes</span>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                                <Link href={`/dashboard/classes/${classItem.id}`}>View</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
            {classes.length > 3 && (
                <Button variant="outline" className="w-full" asChild>
                    <Link href="/dashboard/classes">View All Classes</Link>
                </Button>
            )}
        </div>
    );
}

function RecentActivityFeed() {
    const firestore = useFirestore();
    const recentAttemptsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'attempts'), orderBy('completedAt', 'desc'), limit(5));
    }, [firestore]);

    const { data: recentAttempts, isLoading } = useCollection<Attempt>(recentAttemptsQuery);

    if (isLoading) {
        return (
             <div className="space-y-6">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
        );
    }

    if (!recentAttempts || recentAttempts.length === 0) {
        return <p className="text-sm text-muted-foreground text-center p-4">No recent activity.</p>;
    }

    const formatTimeAgo = (dateString: string | undefined) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + "y ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + "m ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + "d ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + "h ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + "m ago";
        return Math.floor(seconds) + "s ago";
    };

    return (
        <Card className="bg-card/80 backdrop-blur-sm">
            <CardContent className="p-6">
                <ul className="space-y-6">
                    {recentAttempts.map((activity) => (
                        <li key={activity.id} className="flex items-start gap-4">
                            <div className="bg-muted rounded-full p-2">
                                <Users className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-sm">
                                    Student finished <span className="font-semibold">{activity.examTitle || 'quiz'}</span>.
                                </p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                                    <Clock className="h-3 w-3" />
                                    {formatTimeAgo(activity.completedAt)}
                                </p>
                            </div>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}

