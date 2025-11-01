'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Sidebar } from '@/components/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Search } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

export default function CampaignsPage() {
  const campaigns = useQuery(api.campaigns.listCampaigns) || [];

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar activeTab="campaigns" />
      <main className="flex-1 ml-64">
        <div className="container mx-auto py-8 px-4 max-w-6xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight mb-2">Campaigns</h1>
            <p className="text-lg text-muted-foreground">
              View and manage your recruitment campaigns
            </p>
          </div>

          {campaigns.length === 0 ? (
            <Card className="w-full mt-6">
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground py-8">
                  No campaigns found. Create your first campaign to get started.
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {campaigns.map((campaign) => {
                const keywords = campaign.keywords
                  ? campaign.keywords.split(',').slice(0, 3)
                  : [];
                const summary =
                  campaign.jobDescriptionSummary?.substring(0, 200) || 'No description';

                return (
                  <Link key={campaign._id} href={`/campaigns/${campaign._id}`}>
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="line-clamp-2 flex-1">{campaign.name}</CardTitle>
                          <div className="flex items-center gap-1.5 flex-shrink-0 mt-1">
                            {campaign.persuasionAttackStatus === 'running' ? (
                              <>
                                <div className="relative w-3 h-3 flex-shrink-0">
                                  <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                  <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping opacity-75"></div>
                                </div>
                                <span className="text-green-500 font-medium text-xs animate-pulse whitespace-nowrap">In Progress</span>
                              </>
                            ) : campaign.persuasionAttackStatus === 'paused' || campaign.persuasionAttackStatus === 'not_started' ? (
                              <>
                                <div className="relative w-3 h-3 flex-shrink-0">
                                  <div className="absolute inset-0 w-3 h-3 bg-orange-500 rounded-full"></div>
                                </div>
                                <span className="text-orange-500 font-medium text-xs whitespace-nowrap">Started</span>
                              </>
                            ) : null}
                          </div>
                        </div>
                        <CardDescription className="flex items-center gap-2 mt-2">
                          <Calendar className="w-4 h-4" />
                          {new Date(campaign.createdAt).toLocaleDateString()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <div className="prose prose-sm dark:prose-invert max-w-none line-clamp-3 text-muted-foreground">
                              <ReactMarkdown>{summary}</ReactMarkdown>
                            </div>
                          </div>

                          {keywords.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {keywords.map((keyword, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-md"
                                >
                                  {keyword.trim()}
                                </span>
                              ))}
                              {campaign.keywords &&
                                campaign.keywords.split(',').length > 3 && (
                                  <span className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded-md">
                                    +{campaign.keywords.split(',').length - 3} more
                                  </span>
                                )}
                            </div>
                          )}

                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Search className="w-4 h-4" />
                              <span>ID: {campaign._id.substring(0, 8)}...</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

