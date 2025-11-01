'use client';

import { useEffect, useRef } from 'react';
import { RoomAudioRenderer, StartAudio, useChat, useRoomContext, useRemoteParticipants } from '@livekit/components-react';
import type { AppConfig } from '@/app-config';
import { SessionProvider } from '@/components/app/session-provider';
import { ViewController } from '@/components/app/view-controller';
import { Toaster } from '@/components/livekit/toaster';
import { useSession } from '@/components/app/session-provider';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

interface MeetingAppProps {
  appConfig: AppConfig;
  meetingId: Id<'meetings'>;
  meetingStatus: string;
  candidate?: {
    name: string;
    email?: string;
    title?: string;
    company?: string;
  } | null;
  campaign?: {
    name: string;
    jobDescriptionSummary?: string;
    perplexityResearch?: string;
    keywords?: string;
  } | null;
  onStatusChange?: (status: string) => void;
}

/**
 * Meeting-aware App wrapper that handles meeting-specific logic:
 * - Updates meeting status when session starts
 * - Sends cold start message to agent when session starts
 * - Monitors meeting status and auto-ends session when completed
 */
function MeetingAppContent({
  meetingId,
  meetingStatus,
  candidate,
  campaign,
  onStatusChange,
}: Omit<MeetingAppProps, 'appConfig'>) {
  const { isSessionActive, endSession } = useSession();
  const room = useRoomContext();
  const { send } = useChat();
  const participants = useRemoteParticipants();
  const updateMeetingStatus = useMutation(api.meetings.updateMeetingStatus);
  const coldStartSentRef = useRef(false);
  const statusUpdatedRef = useRef(false);

  // Check if agent is available in the room
  const isAgentAvailable = participants.some((p) => p.isAgent);

  // Monitor meeting status and auto-end session when completed
  useEffect(() => {
    if (meetingStatus === 'completed' && isSessionActive) {
      console.log('Meeting status changed to completed, ending session...');
      endSession();
      room.disconnect();
    }
  }, [meetingStatus, isSessionActive, endSession, room]);

  // Handle session start: update status to 'active'
  useEffect(() => {
    if (isSessionActive && !statusUpdatedRef.current && room.state === 'connected') {
      const handleStatusUpdate = async () => {
        try {
          // Update meeting status to 'active' when session starts
          await updateMeetingStatus({
            meetingId,
            status: 'active',
          });
          statusUpdatedRef.current = true;
          console.log('Meeting status updated to active');
        } catch (error) {
          console.error('Error updating meeting status:', error);
        }
      };

      handleStatusUpdate();
    }
  }, [isSessionActive, room.state, meetingId, updateMeetingStatus]);

  // Send cold start message when agent becomes available
  useEffect(() => {
    if (
      isSessionActive &&
      !coldStartSentRef.current &&
      room.state === 'connected' &&
      isAgentAvailable
    ) {
      const handleColdStart = async () => {
        try {
          // Wait a moment for agent to be fully ready
          await new Promise((resolve) => setTimeout(resolve, 1500));

          // Send cold start message to agent (hidden from UI)
          // This message provides context and prompts the agent to start speaking
          const coldStartMessage = `[COLD_START] Meeting Context:
Meeting ID: ${meetingId}
${candidate ? `Candidate: ${candidate.name}${candidate.email ? ` (${candidate.email})` : ''}${candidate.title ? ` - ${candidate.title}` : ''}${candidate.company ? ` at ${candidate.company}` : ''}` : 'Candidate information not available'}
${campaign ? `Campaign: ${campaign.name}` : ''}
${campaign?.jobDescriptionSummary ? `Job Description Summary: ${campaign.jobDescriptionSummary.substring(0, 500)}...` : ''}
${campaign?.keywords ? `Keywords: ${campaign.keywords}` : ''}
${campaign?.perplexityResearch ? `Market Research: ${campaign.perplexityResearch.substring(0, 300)}...` : ''}

You are now in a voice meeting with this candidate. This is a cold start - begin the conversation immediately with a warm, engaging, and highly persuasive greeting. Introduce yourself as an elite recruitment specialist for "I think I love my job! 😭". 

KEY OPENING STRATEGY:
- Use their name immediately to establish personal connection
- Show you've researched them by referencing their background, title, or company
- Create intrigue and excitement about what you're about to share
- Build instant rapport by showing genuine enthusiasm about THEIR potential
- Use assumptive language that positions them as already interested
- Paint a compelling vision of transformation, not just a job opportunity
- Create psychological momentum from the first sentence

Be enthusiastic, magnetic, and persuasive from the moment you start speaking. Your energy should be contagious. Don't wait for the candidate to speak first - you should initiate the conversation with irresistible conviction. Remember: You're not just selling a job, you're selling transformation and their next evolution.`;

          // Send message via LiveKit chat
          // Note: This message will be filtered out from UI display in useChatMessages hook
          await send(coldStartMessage);

          coldStartSentRef.current = true;
          console.log('Cold start message sent to agent');
        } catch (error) {
          console.error('Error during cold start:', error);
        }
      };

      handleColdStart();
    }
  }, [
    isSessionActive,
    room.state,
    isAgentAvailable,
    meetingId,
    candidate,
    campaign,
    send,
  ]);

  return null;
}

export function MeetingApp({
  appConfig,
  meetingId,
  meetingStatus,
  candidate,
  campaign,
  onStatusChange,
}: MeetingAppProps) {
  return (
    <SessionProvider appConfig={appConfig}>
      <MeetingAppContent
        meetingId={meetingId}
        meetingStatus={meetingStatus}
        candidate={candidate}
        campaign={campaign}
        onStatusChange={onStatusChange}
      />
      <main className="grid h-svh grid-cols-1 place-content-center">
        <ViewController />
      </main>
      <StartAudio label="Start Audio" />
      <RoomAudioRenderer />
      <Toaster />
    </SessionProvider>
  );
}

