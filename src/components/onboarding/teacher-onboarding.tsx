'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type TeacherOnboardingProps = {
  onComplete: () => void;
};

export function TeacherOnboarding({ onComplete }: TeacherOnboardingProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Teacher Setup</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Set up your teacher profile to get started with creating and managing quizzes.
          </p>
          <Button onClick={onComplete}>Complete Setup</Button>
        </div>
      </CardContent>
    </Card>
  );
}
