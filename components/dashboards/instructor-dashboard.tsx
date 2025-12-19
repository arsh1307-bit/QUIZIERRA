'use client';

import { motion } from 'framer-motion';
import { Plus, Users, BarChart, CheckSquare, Activity, User, Clock, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, getCountFromServer, limit, orderBy } from 'firebase/firestore';
import type { Exam, Attempt } from '@/lib/types';
import { useEffect, useState } from 'react';
import { Skeleton } from '../ui/skeleton';

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

function StatCards() {
    const firestore = useFirestore();
    const [stats, setStats] = useState({
        activeExams: 0,
        pendingGrading: 0,
        totalStudents: 0,
        avgPassRate: 0,
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!firestore) return;

        const fetchStats = async () => {
            setIsLoading(true);
            try {
                const activeExamsQuery = query(collection(firestore, 'exams'), where('status', '==', 'Live Now'));
                const pendingGradingQuery = query(collection(firestore, 'attempts'), where('status', '==', 'Pending Grading'));
                const totalStudentsQuery = query(collection(firestore, 'users'), where('role', '==', 'student'));
                const completedAttemptsQuery = query(collection(firestore, 'attempts'), where('status', '==', 'Completed'));

                const [activeExamsSnap, pendingGradingSnap, totalStudentsSnap, completedAttemptsSnap] = await Promise.all([
                    getCountFromServer(activeExamsQuery),
                    getCountFromServer(pendingGradingQuery),
                    getCountFromServer(totalStudentsQuery),
                    getDocs(completedAttemptsQuery),
                ]);

                let totalPercentage = 0;
                let completedCount = 0;
                completedAttemptsSnap.forEach(doc => {
                    const attempt = doc.data() as Attempt;
                    if (attempt.totalQuestions > 0) {
                        totalPercentage += (attempt.score / attempt.totalQuestions) * 100;
                        completedCount++;
                    }
                });

                const avgPassRate = completedCount > 0 ? Math.round(totalPercentage / completedCount) : 0;

                setStats({
                    activeExams: activeExamsSnap.data().count,
                    pendingGrading: pendingGradingSnap.data().count,
                    totalStudents: totalStudentsSnap.data().count,
                    avgPassRate: avgPassRate,
                });
            } catch (error) {
                console.error("Error fetching stats:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, [firestore]);
    
    const statItems = [
        { title: "Active Exams", value: stats.activeExams, icon: Activity },
        { title: "Pending Grading", value: stats.pendingGrading, icon: CheckSquare },
        { title: "Total Students", value: stats.totalStudents, icon: Users },
        { title: "Avg. Pass Rate", value: `${stats.avgPassRate}%`, icon: BarChart },
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
                            <stat.icon className="h-5 w-5 text-muted-foreground" />
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

function LiveExamMonitor() {
    const firestore = useFirestore();
    const liveExamsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'exams'), where('status', '==', 'Live Now'));
    }, [firestore]);

    const { data: liveExams, isLoading } = useCollection<Exam>(liveExamsQuery);

    if (isLoading) {
        return <Skeleton className="h-40 w-full" />;
    }

    if (!liveExams || liveExams.length === 0) {
        return <p className="text-sm text-muted-foreground text-center p-4">No exams are live right now.</p>;
    }
    
    return (
        <ul className="space-y-4">
            {liveExams.map(exam => (
                <li key={exam.id} className="flex items-center justify-between">
                    <div>
                        <p className="font-medium">{exam.quizTitle}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="relative flex h-3 w-3">
                                <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></div>
                                <div className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></div>
                            </div>
                            <span>{exam.enrolledStudentIds?.length || 0} Students Enrolled</span>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/proctor/${exam.id}`}>Proctor View</Link>
                    </Button>
                </li>
            ))}
       </ul>
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
        <ul className="space-y-6">
            {recentAttempts.map((activity) => (
                <li key={activity.id} className="flex items-start gap-4">
                    <div className="bg-muted rounded-full p-2">
                        <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                        <p className="text-sm">
                            <span className="font-semibold">{activity.studentId.substring(0,6)}...</span> finished the <span className="font-semibold">{activity.examTitle || 'exam'}</span>.
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                            <Clock className="h-3 w-3" />
                            {formatTimeAgo(activity.completedAt)}
                        </p>
                    </div>
                </li>
            ))}
        </ul>
    );
}

export function InstructorDashboard() {
  // Use enhanced dashboard
  return <EnhancedInstructorDashboard />;
}
