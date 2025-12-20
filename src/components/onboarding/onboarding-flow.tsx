'use client';

import { Button } from '@/components/ui/button';

type OnboardingFlowProps = {
  onComplete: () => void;
};

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Welcome to Quiz Race!</h2>
      <p className="text-muted-foreground">
        Let's get you started with your first race. You can always change these settings later.
      </p>
      <div className="pt-4">
        <Button onClick={onComplete}>Get Started</Button>
      </div>
    </div>
  );
}
