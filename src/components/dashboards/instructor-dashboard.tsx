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
    // Static placeholder values; real aggregation will be added later.
    const statItems = [
        { title: "Active Exams", value: '—', icon: Activity },
        { title: "Pending Grading", value: '—', icon: CheckSquare },
        { title: "Total Students", value: '—', icon: Users },
        { title: "Avg. Pass Rate", value: '—', icon: BarChart },
    ];

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
  return (
    <motion.div 
        className="grid grid-cols-12 gap-8 p-4 md:p-8"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
    >
        {/* Stats */}
        <StatCards />

        {/* Create and Manage */}
        <motion.div className="col-span-12 lg:col-span-8" variants={itemVariants}>
             <h2 className="text-2xl font-semibold tracking-tight mb-4">Create & Manage</h2>
             <div className="grid gap-6 md:grid-cols-2">
                <Link href="/dashboard/quizzes/create" passHref>
                    <Card className="flex flex-col justify-center items-center text-center p-6 bg-card/80 backdrop-blur-sm hover:bg-accent/50 transition-colors cursor-pointer h-full">
                        <Button variant="outline" size="icon" className="h-16 w-16 rounded-full bg-primary/10 mb-4">
                            <Plus className="h-8 w-8 text-primary" />
                        </Button>
                        <h3 className="text-lg font-semibold">Create New Quiz</h3>
                        <p className="text-sm text-muted-foreground mt-1">From Scratch or with AI</p>
                    </Card>
                </Link>
                <Card className="bg-card/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle>Live Exam Monitor</CardTitle>
                        <CardDescription>Currently running exams.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <LiveExamMonitor />
                    </CardContent>
                </Card>
             </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div className="col-span-12 lg:col-span-4" variants={itemVariants}>
            <h2 className="text-2xl font-semibold tracking-tight mb-4">Recent Activity</h2>
            <Card className="bg-card/80 backdrop-blur-sm">
                <CardContent className="p-6">
                    <RecentActivityFeed />
                </CardContent>
            </Card>
        </motion.div>
    </motion.div>
  );
}
