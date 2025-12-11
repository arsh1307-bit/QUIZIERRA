'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function GenerateManual() {
    return (
        <Card className="border-dashed">
            <CardHeader className="text-center">
                <CardTitle>Manual Creation</CardTitle>
                <CardDescription>This feature is coming soon.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-center h-48">
                    <p className="text-muted-foreground">You will be able to add questions one-by-one here.</p>
                </div>
            </CardContent>
        </Card>
    )
}
