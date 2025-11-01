'use client';

import { useState, useRef } from 'react';
import { PipelineTimeline } from '@/components/pipeline-timeline';
import { CandidateList, Candidate } from '@/components/candidate-list';
import { ErrorDisplay } from '@/components/error-display';
import { StatusDisplay } from '@/components/status-display';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText, Loader2 } from 'lucide-react';

interface ProgressStep {
  step: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  message?: string;
  data?: any;
  timestamp?: number;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [campaignName, setCampaignName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ProgressStep[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setError('Please select a PDF file');
      return;
    }

    if (!campaignName.trim()) {
      setError('Please enter a campaign name');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProgress([]);
    setCandidates([]);
    setCampaignId(null);

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('campaignName', campaignName.trim());

      const response = await fetch('/api/recruitment-pipeline', {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal,
      });

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'final') {
                // Final result
                if (data.success) {
                  if (data.campaignId) {
                    setCampaignId(data.campaignId);
                  }
                  if (data.candidates) {
                    setCandidates(data.candidates);
                  }
                } else {
                  setError(data.error || 'Pipeline failed');
                }
                setIsProcessing(false);
              } else {
                // Progress update
                setProgress((prev) => {
                  // Update existing step or add new one
                  const existingIndex = prev.findIndex(
                    (p) => p.step === data.step,
                  );

                  if (existingIndex >= 0) {
                    // Update existing
                    const updated = [...prev];
                    updated[existingIndex] = data;
                    return updated;
                  } else {
                    // Add new
                    return [...prev, data];
                  }
                });
              }
            } catch (parseError) {
              console.error('Failed to parse SSE data:', parseError);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Request aborted');
      } else {
        setError(
          err instanceof Error ? err.message : 'An unknown error occurred',
        );
      }
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <main className="flex-1 ml-64">
        <div className="container mx-auto py-8 px-4 max-w-6xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight mb-2">I think I love my job! 😭</h1>
            <p className="text-lg text-muted-foreground mb-6">
              Upload a job description to start the automated candidate search and seduction pipeline 😈
            </p>
            <div className="flex justify-center mb-8">
              <img
                src="/ithinkilovemyjob.png"
                alt="I think I love my job!"
                className="max-h-[200px] h-auto rounded-lg"
              />
            </div>
          </div>

          <Card className="mb-8">
            <CardHeader>
            <CardTitle>Start New Campaign</CardTitle>
            <CardDescription>
              Enter campaign details and upload a job description to begin processing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="campaignName">Campaign Name</Label>
                <Input
                  id="campaignName"
                  name="campaignName"
                  type="text"
                  autoComplete="off"
                  placeholder="e.g., Senior Software Engineer - Q1 2025"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  disabled={isProcessing}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">Job Description</Label>
                <div className="flex items-center gap-4">
                  <label
                    htmlFor="file"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {file ? (
                        <>
                          <FileText className="w-8 h-8 mb-2 text-primary" />
                          <p className="text-sm font-medium">{file.name}</p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                          <p className="mb-2 text-sm text-muted-foreground">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-muted-foreground">PDF only</p>
                        </>
                      )}
                    </div>
                    <input
                      id="file"
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={isProcessing}
                      required
                    />
                  </label>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isProcessing || !file || !campaignName.trim()}
                className="w-full"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing Seduction...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Start Seduction 😈
                  </>
                )}
              </Button>
            </form>
            </CardContent>
          </Card>

          {error && (
            <ErrorDisplay
              error={error}
              onDismiss={() => setError(null)}
            />
          )}

          {progress.length > 0 && <StatusDisplay steps={progress} />}

          {progress.length > 0 && <PipelineTimeline steps={progress} />}

          {candidates.length > 0 && <CandidateList candidates={candidates} />}

          {campaignId && (
            <Card className="mt-6">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Campaign ID:</span> {campaignId}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
