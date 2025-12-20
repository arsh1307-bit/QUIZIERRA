'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function ProctorPage({ params }: { params: { examId: string } }) {
    return (
        <div className="p-8">
            <Card>
                <CardHeader>
                    <CardTitle>Proctor View</CardTitle>
                    <CardDescription>Exam ID: {params.examId}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">Proctoring features coming soon!</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
