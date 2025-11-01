'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useParams } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { MeetingApp } from '@/components/app/meeting-app';
import { APP_CONFIG_DEFAULTS } from '@/app-config';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, User, Hash, PhoneOff } from 'lucide-react';

export default function MeetingDetailPage() {
  const params = useParams();
  const meetingId = params.id as string;
  
  const [isEndingMeeting, setIsEndingMeeting] = useState(false);

  // Fetch meeting data using Convex query (auto-updates when status changes)
  const meeting = useQuery(
    api.meetings.getMeeting,
    meetingId ? { meetingId: meetingId as Id<'meetings'> } : 'skip'
  );

  // Use Convex mutation to end meeting
  const updateMeetingStatus = useMutation(api.meetings.updateMeetingStatus);

  // Handle ending the meeting using Convex mutation
  const handleEndMeeting = useCallback(async () => {
    if (!meetingId || isEndingMeeting || !meeting) return;

    setIsEndingMeeting(true);
    
    try {
      // Update meeting status to 'completed' using Convex mutation
      await updateMeetingStatus({
        meetingId: meetingId as Id<'meetings'>,
        status: 'completed',
      });

      // Meeting state will update automatically via the useQuery hook
      // The page will re-render showing the "meeting ended" message
    } catch (error) {
      console.error('Error ending meeting:', error);
      alert(error instanceof Error ? error.message : 'Failed to end meeting');
    } finally {
      setIsEndingMeeting(false);
    }
  }, [meetingId, meeting, isEndingMeeting, updateMeetingStatus]);

  // Loading state
  if (meeting === undefined) {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar activeTab="meetings" />
        <main className="flex-1 ml-64">
          <div className="h-screen flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </main>
      </div>
    );
  }

  // Meeting not found
  if (meeting === null) {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar activeTab="meetings" />
        <main className="flex-1 ml-64">
          <div className="h-screen flex items-center justify-center">
            <Badge 
              variant="destructive" 
              className="text-lg px-6 py-3 bg-destructive text-destructive-foreground"
            >
              Meeting Not Found
            </Badge>
          </div>
        </main>
      </div>
    );
  }

  // Meeting already ended
  if (meeting.status === 'completed') {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar activeTab="meetings" />
        <main className="flex-1 ml-64">
          <div className="h-screen flex items-center justify-center">
            <Card className="max-w-md w-full border-yellow-500/50 bg-yellow-500/10">
              <CardContent className="p-6">
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <PhoneOff className="w-6 h-6 text-yellow-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-yellow-600 dark:text-yellow-400 mb-2">
                      Meeting Has Already Been Ended
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      This meeting was completed on {meeting.completedAt 
                        ? new Date(meeting.completedAt).toLocaleString()
                        : 'recently'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // Active meeting - show LiveKit interface
  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar activeTab="meetings" />
      <main className="flex-1 ml-64">
        <div className="h-screen relative">
          {/* Header with Meeting ID and Candidate Name */}
          <div className="absolute top-4 right-4 z-50 flex items-center gap-4">
            <div className="flex items-center gap-2 bg-card/80 backdrop-blur-sm border rounded-lg px-4 py-2">
              <Hash className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-mono text-muted-foreground">
                {meeting._id}
              </span>
            </div>
            {meeting.candidate && (
              <div className="flex items-center gap-2 bg-card/80 backdrop-blur-sm border rounded-lg px-4 py-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {meeting.candidate.name}
                </span>
              </div>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={handleEndMeeting}
              disabled={isEndingMeeting}
              className="bg-destructive/90 hover:bg-destructive"
            >
              {isEndingMeeting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Ending...
                </>
              ) : (
                <>
                  <PhoneOff className="w-4 h-4 mr-2" />
                  End Meeting
                </>
              )}
            </Button>
          </div>

          {/* LiveKit Meeting Interface with Meeting Context */}
          <div className="h-full">
            <MeetingApp
              appConfig={APP_CONFIG_DEFAULTS}
              meetingId={meeting._id}
              meetingStatus={meeting.status}
              candidate={meeting.candidate}
              campaign={meeting.campaign}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

