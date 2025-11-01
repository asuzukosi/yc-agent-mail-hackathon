'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Linkedin } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface Candidate {
  name: string;
  email?: string;
  linkedinUrl?: string;
  title?: string;
  company?: string;
}

interface CandidateListProps {
  candidates: Candidate[];
}

export function CandidateList({ candidates }: CandidateListProps) {
  if (candidates.length === 0) {
    return (
      <Card className="w-full mt-6">
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground py-8">
            No candidates found yet.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full mt-6">
      <CardHeader>
        <CardTitle>
          Found {candidates.length} Candidate{candidates.length !== 1 ? 's' : ''}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {candidates.map((candidate, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg text-foreground">
                      {candidate.name}
                    </h3>
                    {candidate.title && (
                      <div className="text-muted-foreground mt-1">
                        {candidate.title}
                      </div>
                    )}
                    {candidate.company && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {candidate.company}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 items-end shrink-0">
                    {candidate.email && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="gap-2"
                      >
                        <a href={`mailto:${candidate.email}`}>
                          <Mail className="w-4 h-4" />
                          {candidate.email}
                        </a>
                      </Button>
                    )}
                    {candidate.linkedinUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="gap-2"
                      >
                        <a
                          href={candidate.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Linkedin className="w-4 h-4" />
                          LinkedIn
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}