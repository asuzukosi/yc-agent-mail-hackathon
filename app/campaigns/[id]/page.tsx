'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useParams } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Mail, Linkedin, Loader2, Users as UsersIcon, Bot, MessageSquare, ChevronDown, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ChatInterface } from '@/components/chat-interface';
import { motion, AnimatePresence } from 'motion/react';

export default function CampaignDetailPage() {
  const params = useParams();
  const campaignId = params.id as Id<'campaigns'>;
  const campaign = useQuery(api.campaigns.getCampaign, { campaignId });
  const candidates = useQuery(api.candidates.getCandidatesByCampaign, { campaignId }) || [];
  const agentsData = useQuery(api.agents.getAgentsByCampaign, { campaignId });
  const agents = agentsData || [];
  const updateCampaignStatus = useMutation(api.campaigns.updateCampaignStatus);

  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [threads, setThreads] = useState<Array<{
    threadId: string;
    subject: string;
    participantName: string;
    participantEmail: string;
    messageCount: number;
    lastMessageAt: string;
    status: string;
    messages: Array<{
      messageId: string;
      from: string;
      to: string[];
      content: string;
      sentByAgent: boolean;
      createdAt: string;
    }>;
  }>>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);

  // Get campaign status (default to 'not_started' if not set)
  const campaignStatus = campaign?.persuasionAttackStatus || 'not_started';
  const isRunning = campaignStatus === 'running';
  const isPaused = campaignStatus === 'paused';

  // Fetch threads from AgentMail
  useEffect(() => {
    if (!campaignId || !isRunning) {
      return;
    }

    const fetchThreads = async () => {
      setIsLoadingThreads(true);
      try {
        const response = await fetch(`/api/campaigns/${campaignId}/threads`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to fetch threads' }));
          throw new Error(errorData.error || `Failed to fetch threads: ${response.status} ${response.statusText}`);
        }
        const result = await response.json();
        setThreads(result.threads || []);
      } catch (error) {
        console.error('Failed to fetch threads:', error);
        // Set empty threads array on error to avoid breaking UI
        setThreads([]);
      } finally {
        setIsLoadingThreads(false);
      }
    };

    // Fetch initial data
    fetchThreads();

    // Refresh every 30 seconds
    const interval = setInterval(fetchThreads, 30000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, isRunning]);

  // Helper function to format timestamp
  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return 'Just now';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  if (!campaign) {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar activeTab="campaigns" />
        <main className="flex-1 ml-64">
          <div className="container mx-auto py-8 px-4 max-w-6xl">
            <div className="flex items-center justify-center min-h-[400px]">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  const keywords = campaign.keywords ? campaign.keywords.split(',') : [];

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar activeTab="campaigns" />
      <main className="flex-1 ml-64">
        <div className="container mx-auto py-8 px-4 max-w-6xl">
          {/* Header with Persuasion Attack Button */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-2">{campaign.name}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>Created: {new Date(campaign.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>ID: {campaign._id}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isRunning ? (
                <>
                  <div className="relative w-4 h-4 flex-shrink-0">
                    <div className="absolute inset-0 w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
                    <div className="absolute inset-0 w-4 h-4 bg-green-500 rounded-full animate-ping opacity-75"></div>
                  </div>
                  <span className="text-green-500 font-medium text-xs animate-pulse whitespace-nowrap">In Progress</span>
                </>
              ) : (
                <>
                  <div className="relative w-4 h-4 flex-shrink-0">
                    <div className="absolute inset-0 w-4 h-4 bg-orange-500 rounded-full"></div>
                  </div>
                  <span className="text-orange-500 font-medium text-xs whitespace-nowrap">Started</span>
                </>
              )}
              <Button
                onClick={async () => {
                  if (isProcessing) return;
                  setIsProcessing(true);
                  
                  try {
                    if (isRunning) {
                      // Pause the campaign
                      await updateCampaignStatus({ campaignId, status: 'paused' });
                      console.log('Campaign paused successfully!');
                    } else {
                      // Start or resume the campaign
                      const response = await fetch(`/api/campaigns/${campaignId}/start-persuasion-attack`, {
                        method: 'POST',
                      });
                      if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error || 'Failed to start campaign');
                      }
                      const result = await response.json();
                      console.log('Campaign started/resumed successfully!', result);
                      if (result.agentsCreated > 0) {
                        alert(`Campaign started! Created ${result.agentsCreated} agent(s).`);
                      } else {
                        alert('Campaign started! All agents already exist.');
                      }
                    }
                  } catch (error) {
                    console.error('Failed to update campaign status:', error);
                    alert(error instanceof Error ? error.message : 'Failed to update campaign status');
                  } finally {
                    setIsProcessing(false);
                  }
                }}
                variant={isRunning ? 'secondary' : 'default'}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : isRunning ? (
                  'Pause Campaign'
                ) : (
                  'Start Persuasion Attack'
                )}
              </Button>
            </div>
          </div>

          {/* Grid Layout */}
          <div className="grid gap-x-6 gap-y-2 md:grid-cols-2">
            {/* Left Column: Job Description */}
            <div className="md:row-span-2">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Job Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{campaign.jobDescriptionSummary}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Attack Control Panel on top */}
            <div>
              <ChatInterface campaignId={campaign._id} />
            </div>

            {/* Right Column: Keywords below Attack Control Panel */}
            <div>
              <Card className="pb-0">
                <CardHeader className="pb-3">
                  <CardTitle>Keywords</CardTitle>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((keyword, idx) => (
                      <Badge key={idx} variant="secondary" className="text-sm">
                        {keyword.trim()}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Perplexity Research - Full Width */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Perplexity Research</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{campaign.perplexityResearch}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>

            {/* Candidates Table */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UsersIcon className="w-5 h-5" />
                  Candidates ({candidates.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>LinkedIn</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {candidates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No candidates found
                        </TableCell>
                      </TableRow>
                    ) : (
                      candidates.map((candidate) => (
                        <TableRow key={candidate._id}>
                          <TableCell className="font-medium">{candidate.name}</TableCell>
                          <TableCell>
                            {candidate.email ? (
                              <a
                                href={`mailto:${candidate.email}`}
                                className="flex items-center gap-2 text-primary hover:underline"
                              >
                                <Mail className="w-4 h-4" />
                                {candidate.email}
                              </a>
                            ) : (
                              <span className="text-muted-foreground">No email</span>
                            )}
                          </TableCell>
                          <TableCell>{candidate.title || '-'}</TableCell>
                          <TableCell>{candidate.company || '-'}</TableCell>
                          <TableCell>
                            {candidate.linkedinUrl ? (
                              <a
                                href={candidate.linkedinUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-primary hover:underline"
                              >
                                <Linkedin className="w-4 h-4" />
                                View
                              </a>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Agents Table */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  Agents ({agents.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Target Candidate</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No agents created yet. Start a persuasion attack to create agents.
                        </TableCell>
                      </TableRow>
                    ) : (
                      agents.map((agent) => (
                        <TableRow key={agent._id}>
                          <TableCell className="font-medium">
                            {agent.email ? (
                              <a
                                href={`mailto:${agent.email}`}
                                className="flex items-center gap-2 text-primary hover:underline"
                              >
                                <Mail className="w-4 h-4" />
                                {agent.email}
                              </a>
                            ) : (
                              <span className="text-muted-foreground">No email</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {agent.targetCandidate ? (
                              <div>
                                <div className="font-medium">{agent.targetCandidate.name}</div>
                                {agent.targetCandidate.title && (
                                  <div className="text-sm text-muted-foreground">
                                    {agent.targetCandidate.title}
                                    {agent.targetCandidate.company && ` at ${agent.targetCandidate.company}`}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Unknown</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                agent.status === 'active'
                                  ? 'default'
                                  : agent.status === 'completed'
                                    ? 'secondary'
                                    : 'outline'
                              }
                            >
                              {agent.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(agent.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Threads Table */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Threads ({threads.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingThreads ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : threads.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No email threads yet</p>
                    <p className="text-sm mt-2">Start a campaign to begin sending emails to candidates</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {threads.map((thread) => {
                      const isExpanded = expandedThreads.has(thread.threadId);
                      
                      return (
                        <div
                          key={thread.threadId}
                          className="border rounded-lg bg-card overflow-hidden transition-all hover:border-primary/50"
                        >
                          {/* Thread Header - Clickable */}
                          <div
                            className="cursor-pointer p-4 hover:bg-muted/50 transition-colors"
                            onClick={() => {
                              setExpandedThreads((prev) => {
                                const next = new Set(prev);
                                if (next.has(thread.threadId)) {
                                  next.delete(thread.threadId);
                                } else {
                                  next.add(thread.threadId);
                                }
                                return next;
                              });
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 transition-transform duration-200 mt-0.5" style={{
                                transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)'
                              }}>
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col gap-2">
                                  {/* Subject and Metadata Row */}
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-base mb-1">{thread.subject}</div>
                                      <div className="flex items-center gap-3 flex-wrap text-sm text-muted-foreground">
                                        <span className="font-medium">{thread.participantName}</span>
                                        <span>•</span>
                                        <span>{thread.messageCount} message{thread.messageCount !== 1 ? 's' : ''}</span>
                                        <span>•</span>
                                        <span>{formatTimestamp(thread.lastMessageAt)}</span>
                                      </div>
                                    </div>
                                    <Badge
                                      variant={
                                        thread.status === 'active'
                                          ? 'default'
                                          : thread.status === 'completed'
                                            ? 'secondary'
                                            : 'outline'
                                      }
                                      className="flex-shrink-0"
                                    >
                                      {thread.status}
                                    </Badge>
                                  </div>
                                  
                                  {/* Message Content Preview */}
                                  {thread.messages.length > 0 && (
                                    <div className="mt-1 space-y-1">
                                      {thread.messages.slice(-2).reverse().map((message) => {
                                        // Truncate content for preview
                                        const previewContent = message.content.length > 200 
                                          ? message.content.substring(0, 200) + '...'
                                          : message.content;
                                        
                                        return (
                                          <div
                                            key={message.messageId}
                                            className={`text-sm p-2 rounded border-l-2 ${
                                              message.sentByAgent
                                                ? 'bg-primary/5 border-primary/30'
                                                : 'bg-secondary/30 border-secondary/50'
                                            }`}
                                          >
                                            <div className="flex items-center gap-2 mb-1">
                                              {message.sentByAgent ? (
                                                <Bot className="w-3 h-3 text-primary" />
                                              ) : (
                                                <Mail className="w-3 h-3 text-secondary-foreground" />
                                              )}
                                              <span className={`text-xs font-medium ${
                                                message.sentByAgent
                                                  ? 'text-primary'
                                                  : 'text-secondary-foreground'
                                              }`}>
                                                {message.sentByAgent ? 'Agent' : thread.participantName}
                                              </span>
                                              <span className="text-xs text-muted-foreground">
                                                • {formatTimestamp(message.createdAt)}
                                              </span>
                                            </div>
                                            <p className="text-xs text-foreground whitespace-pre-wrap line-clamp-2 leading-relaxed">
                                              {previewContent}
                                            </p>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Messages Dropdown - Animated */}
                          <AnimatePresence>
                            {isExpanded && thread.messages.length > 0 && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: 'easeInOut' }}
                                className="overflow-hidden"
                              >
                                <div className="p-4 pt-0 border-t bg-muted/30 space-y-3">
                                  <div className="text-sm font-medium text-muted-foreground mb-3 pt-2">
                                    Messages ({thread.messages.length})
                                  </div>
                                  <div className="space-y-3">
                                    {thread.messages.map((message, idx) => (
                                      <motion.div
                                        key={message.messageId}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05, duration: 0.2 }}
                                        className={`p-3 rounded-lg ${
                                          message.sentByAgent
                                            ? 'bg-primary/10 border-l-4 border-primary'
                                            : 'bg-secondary/50 border-l-4 border-secondary'
                                        }`}
                                      >
                                        <div className="flex items-start justify-between mb-2">
                                          <div className="flex items-center gap-2">
                                            {message.sentByAgent ? (
                                              <Bot className="w-4 h-4 text-primary" />
                                            ) : (
                                              <Mail className="w-4 h-4 text-secondary-foreground" />
                                            )}
                                            <span
                                              className={`text-sm font-medium ${
                                                message.sentByAgent
                                                  ? 'text-primary'
                                                  : 'text-secondary-foreground'
                                              }`}
                                            >
                                              {message.sentByAgent ? 'Agent' : thread.participantName}
                                            </span>
                                          </div>
                                          <span className="text-xs text-muted-foreground">
                                            {formatTimestamp(message.createdAt)}
                                          </span>
                                        </div>
                                        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                                          {message.content}
                                        </p>
                                      </motion.div>
                                    ))}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

