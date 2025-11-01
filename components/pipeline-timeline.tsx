'use client';

import { Card, CardContent } from '@/components/ui/card';
import {
  CheckCircle2,
  Loader2,
  XCircle,
  FileText,
  Brain,
  Hash,
  Linkedin,
  Mail,
  Database,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgressStep {
  step: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  message?: string;
  data?: any;
}

interface PipelineTimelineProps {
  steps: ProgressStep[];
}

// Define the order of phases
const phaseOrder = [
  'processing-pdf',
  'researching-perplexity',
  'extracting-queries',
  'searching-linkedin',
  'enriching-emails',
  'storing-data',
  'complete',
];

const stepConfig: Record<
  string,
  { label: string; icon: React.ElementType; description: string }
> = {
  'processing-pdf': {
    label: 'Processing PDF',
    icon: FileText,
    description: 'Extracting text from job description PDF',
  },
  'researching-perplexity': {
    label: 'Researching Market',
    icon: Brain,
    description: 'Analyzing market trends and skills',
  },
  'extracting-queries': {
    label: 'Generating Queries',
    icon: Hash,
    description: 'Creating LinkedIn search queries',
  },
  'searching-linkedin': {
    label: 'Searching LinkedIn',
    icon: Linkedin,
    description: 'Finding candidate profiles',
  },
  'enriching-emails': {
    label: 'Enriching Emails',
    icon: Mail,
    description: 'Finding candidate email addresses',
  },
  'storing-data': {
    label: 'Storing Data',
    icon: Database,
    description: 'Saving to database',
  },
  complete: {
    label: 'Complete',
    icon: CheckCircle,
    description: 'Pipeline finished successfully',
  },
};

export function PipelineTimeline({ steps }: PipelineTimelineProps) {
  // Get unique steps with their latest status, maintaining order
  const stepMap = new Map<string, ProgressStep>();
  const stepOrder: string[] = [];

  for (const step of steps) {
    if (!stepMap.has(step.step)) {
      stepOrder.push(step.step);
    }
    // Always keep the latest status for each step
    stepMap.set(step.step, step);
  }

  // Only show steps that have been started (have a status other than pending)
  // Show completed steps + current processing step
  const visiblePhases: ProgressStep[] = [];

  // Get the current processing step
  const processingStep = Array.from(stepMap.values()).find(
    (s) => s.status === 'processing',
  );

  // Add all completed steps in order
  for (const stepKey of stepOrder) {
    const step = stepMap.get(stepKey);
    if (!step) continue;

    // Skip error step (it's a special step)
    if (step.step === 'error') continue;

    if (step.status === 'completed') {
      visiblePhases.push(step);
    } else if (step.status === 'processing') {
      visiblePhases.push(step);
      break; // Stop at the first processing step
    }
  }

  // If no steps are visible yet, show nothing
  if (visiblePhases.length === 0) {
    return null;
  }

  return (
    <Card className="w-full mt-6">
      <CardContent className="pt-6">
        <h2 className="text-xl font-semibold mb-6">Pipeline Progress</h2>
        <div className="space-y-4">
          {visiblePhases.map((step, index) => {
            const config = stepConfig[step.step];
            if (!config) return null;

            const { label, icon: Icon, description } = config;
            const isCompleted = step.status === 'completed';
            const isProcessing = step.status === 'processing';
            const isError = step.status === 'error';
            const isLast = index === visiblePhases.length - 1;

            return (
              <div
                key={`${step.step}-${index}`}
                className={cn(
                  'relative flex items-start gap-4',
                  !isLast && 'pb-6',
                  !isLast &&
                    'after:absolute after:left-3 after:top-10 after:h-full after:w-[2px]',
                  !isLast &&
                    isCompleted &&
                    'after:bg-green-500/50',
                  !isLast &&
                    !isCompleted &&
                    'after:bg-border',
                )}
              >
                {/* Icon/Status Indicator */}
                <div
                  className={cn(
                    'relative flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center z-10',
                    isCompleted && 'bg-green-500',
                    isProcessing && 'bg-primary',
                    isError && 'bg-destructive',
                  )}
                >
                  {isCompleted && (
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  )}
                  {isProcessing && (
                    <>
                      <div className="absolute inset-0 rounded-full animate-pulse bg-primary/50" />
                      <Loader2 className="w-4 h-4 text-white animate-spin relative z-10" />
                    </>
                  )}
                  {isError && <XCircle className="w-4 h-4 text-white" />}
                </div>

                {/* Content */}
                <div
                  className={cn(
                    'flex-1 min-w-0 rounded-lg border p-4 transition-all',
                    isCompleted && 'border-green-500/50 bg-green-500/10',
                    isProcessing && 'border-primary/50 bg-primary/10',
                    isError && 'border-destructive/50 bg-destructive/10',
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 text-primary animate-spin" />
                        ) : (
                          <Icon
                            className={cn(
                              'w-4 h-4',
                              isCompleted && 'text-green-500',
                              isProcessing && 'text-primary',
                              isError && 'text-destructive',
                            )}
                          />
                        )}
                        <h3
                          className={cn(
                            'font-medium',
                            isCompleted && 'text-green-500',
                            isProcessing && 'text-primary',
                            isError && 'text-destructive',
                          )}
                        >
                          {label}
                        </h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {description}
                      </p>
                      {step.message && (
                        <p
                          className={cn(
                            'text-sm mt-2',
                            isError ? 'text-destructive' : 'text-foreground/70',
                          )}
                        >
                          {step.message}
                        </p>
                      )}
                      {step.data && (
                        <div className="text-xs text-muted-foreground mt-2 font-mono">
                          {JSON.stringify(step.data, null, 2)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
