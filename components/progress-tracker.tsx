'use client';

import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Loader2, XCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgressStep {
  step: string;
  status: 'processing' | 'completed' | 'error';
  message?: string;
  data?: any;
}

interface ProgressTrackerProps {
  steps: ProgressStep[];
}

const stepLabels: Record<string, string> = {
  'processing-pdf': 'Processing PDF',
  'researching-perplexity': 'Researching with Perplexity',
  'extracting-queries': 'Extracting LinkedIn Queries',
  'searching-linkedin': 'Searching LinkedIn',
  'enriching-emails': 'Enriching Emails',
  'storing-data': 'Storing Data',
  'complete': 'Complete',
};

export function ProgressTracker({ steps }: ProgressTrackerProps) {
  return (
    <Card className="w-full max-w-2xl mx-auto mt-6">
      <CardContent className="pt-6">
        <h2 className="text-xl font-semibold mb-6">Pipeline Progress</h2>
        <div className="space-y-4">
          {steps.map((step, index) => {
            const label = stepLabels[step.step] || step.step;
            const isCompleted = step.status === 'completed';
            const isProcessing = step.status === 'processing';
            const isError = step.status === 'error';

            return (
              <div
                key={`${step.step}-${index}`}
                className="flex items-start gap-4 p-4 rounded-lg border bg-card"
              >
                <div className="flex-shrink-0 mt-1">
                  {isCompleted && (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  )}
                  {isProcessing && (
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  )}
                  {isError && <XCircle className="w-6 h-6 text-destructive" />}
                  {!isCompleted && !isProcessing && !isError && (
                    <Circle className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground">{label}</div>
                  {step.message && (
                    <div
                      className={cn(
                        'text-sm mt-1',
                        isError ? 'text-destructive' : 'text-muted-foreground'
                      )}
                    >
                      {step.message}
                    </div>
                  )}
                  {step.data && (
                    <div className="text-xs text-muted-foreground mt-1 font-mono">
                      {JSON.stringify(step.data)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}