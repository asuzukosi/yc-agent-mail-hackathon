'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CheckCircle2 } from 'lucide-react';

interface ProgressStep {
  step: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  message?: string;
  data?: any;
}

interface StatusDisplayProps {
  steps: ProgressStep[];
}

const stepConfig: Record<
  string,
  { label: string; description: string }
> = {
  'processing-pdf': {
    label: 'Processing PDF',
    description: 'Extracting text from job description PDF',
  },
  'researching-perplexity': {
    label: 'Researching Market',
    description: 'Analyzing market trends and skills',
  },
  'extracting-queries': {
    label: 'Generating Queries',
    description: 'Creating LinkedIn search queries',
  },
  'searching-linkedin': {
    label: 'Searching LinkedIn',
    description: 'Finding candidate profiles',
  },
  'enriching-emails': {
    label: 'Enriching Emails',
    description: 'Finding candidate email addresses',
  },
  'storing-data': {
    label: 'Storing Data',
    description: 'Saving to database',
  },
  complete: {
    label: 'Complete',
    description: 'Pipeline finished successfully',
  },
};

export function StatusDisplay({ steps }: StatusDisplayProps) {
  // Get the current step being processed
  const currentStep = steps.find((step) => step.status === 'processing');
  
  // Get the last completed step
  const completedSteps = steps.filter((step) => step.status === 'completed');
  const lastCompletedStep = completedSteps.length > 0 
    ? completedSteps[completedSteps.length - 1]
    : null;

  // Get the searching-linkedin step to show candidate names
  const linkedInStep = steps.find(
    (step) => step.step === 'searching-linkedin' && step.status === 'completed'
  );

  // Get the enriching-emails step to show email status
  const emailStep = steps.find(
    (step) => step.step === 'enriching-emails'
  );

  // If there's a current processing step, show it
  if (currentStep) {
    const config = stepConfig[currentStep.step] || {
      label: currentStep.step,
      description: currentStep.message || 'Processing...',
    };

    return (
      <Alert variant="success" className="mb-4">
        <Loader2 className="h-5 w-5 animate-spin" />
        <div>
          <AlertTitle>{config.label}</AlertTitle>
          <AlertDescription>
            {currentStep.message || config.description}
            {currentStep.step === 'searching-linkedin' &&
              linkedInStep?.data?.candidateNames &&
              linkedInStep.data.candidateNames.length > 0 && (
                <div className="mt-2 pt-2 border-t border-green-600/30">
                  <span className="font-medium">Candidates found: </span>
                  {linkedInStep.data.candidateNames.join(', ')}
                  {linkedInStep.data.candidateCount >
                    linkedInStep.data.candidateNames.length && (
                    <span className="text-green-400/80">
                      {' '}
                      (+
                      {linkedInStep.data.candidateCount -
                        linkedInStep.data.candidateNames.length}{' '}
                      more)
                    </span>
                  )}
                </div>
              )}
            {currentStep.step === 'enriching-emails' &&
              currentStep.data?.currentCandidate && (
                <div className="mt-2 pt-2 border-t border-green-600/30">
                  <span className="font-medium">
                    {currentStep.data.currentCandidate}
                    {currentStep.data.emailFound ? (
                      <span className="text-green-400 ml-2">✅ email found</span>
                    ) : (
                      <span className="text-yellow-400 ml-2">⚠️ no email found</span>
                    )}
                  </span>
                  <div className="text-sm text-muted-foreground mt-1">
                    Progress: {currentStep.data.progress}/{currentStep.data.total}
                  </div>
                </div>
              )}
          </AlertDescription>
        </div>
      </Alert>
    );
  }

  // If no current step but there's a completed step, show completion
  if (lastCompletedStep) {
    const config = stepConfig[lastCompletedStep.step] || {
      label: lastCompletedStep.step,
      description: lastCompletedStep.message || 'Completed',
    };

    if (lastCompletedStep.step === 'complete') {
      return (
        <Alert variant="success" className="mb-4">
          <CheckCircle2 className="h-5 w-5" />
          <div>
            <AlertTitle>Pipeline Complete</AlertTitle>
            <AlertDescription>
              {lastCompletedStep.message || 'All phases completed successfully'}
            </AlertDescription>
          </div>
        </Alert>
      );
    }

    // Show completed step with candidate names if it's searching-linkedin
    if (lastCompletedStep.step === 'searching-linkedin' && linkedInStep) {
      return (
        <Alert variant="success" className="mb-4">
          <CheckCircle2 className="h-5 w-5" />
          <div>
            <AlertTitle>{config.label}</AlertTitle>
            <AlertDescription>
              {lastCompletedStep.message || config.description}
              {linkedInStep.data?.candidateNames &&
                linkedInStep.data.candidateNames.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-green-600/30">
                    <span className="font-medium">Candidates: </span>
                    {linkedInStep.data.candidateNames.join(', ')}
                    {linkedInStep.data.candidateCount >
                      linkedInStep.data.candidateNames.length && (
                      <span className="text-green-400/80">
                        {' '}
                        (+
                        {linkedInStep.data.candidateCount -
                          linkedInStep.data.candidateNames.length}{' '}
                        more)
                      </span>
                    )}
                  </div>
                )}
            </AlertDescription>
          </div>
        </Alert>
      );
    }

    // Show completed step with email enrichment results
    if (lastCompletedStep.step === 'enriching-emails' && emailStep?.data) {
      return (
        <Alert variant="success" className="mb-4">
          <CheckCircle2 className="h-5 w-5" />
          <div>
            <AlertTitle>{config.label}</AlertTitle>
            <AlertDescription>
              <div className="space-y-2">
                <div>{lastCompletedStep.message || config.description}</div>
                {emailStep.data.enrichedNames && emailStep.data.enrichedNames.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-green-600/30">
                    <span className="font-medium">✅ Email found: </span>
                    <div className="mt-1 space-y-1">
                      {emailStep.data.enrichedNames.map((name: string, idx: number) => (
                        <div key={idx} className="text-sm">
                          {name} ✅
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {emailStep.data.noEmailNames && emailStep.data.noEmailNames.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-yellow-600/30">
                    <span className="font-medium">⚠️ No email found: </span>
                    <div className="mt-1 space-y-1">
                      {emailStep.data.noEmailNames.map((name: string, idx: number) => (
                        <div key={idx} className="text-sm">
                          {name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </AlertDescription>
          </div>
        </Alert>
      );
    }
  }

  return null;
}

