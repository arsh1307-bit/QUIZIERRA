'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function QuizResultsPage({ params }: { params: { quizId: string } }) {
    return (
        <div className="p-8">
            <Card>
                <CardHeader>
                    <CardTitle>Quiz Results &amp; Review</CardTitle>
                    <CardDescription>Quiz ID: {params.quizId}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-96 w-full" />
                     <p className="text-center text-muted-foreground mt-4">Teacher Review Panel coming soon!</p>
                </CardContent>
            </Card>
        </div>
    )
}
