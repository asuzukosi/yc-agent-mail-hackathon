import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { scheduleGoogleCalendarMeeting } from '@/lib/composio-client';
import { logRequestStart, logRequestSuccess, logRequestError, extractRequestContext } from '@/lib/logger';

const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Candidate Accepted Endpoint
 * 
 * When a candidate accepts an offer:
 * 1. Updates candidate status to 'accepted'
 * 2. Updates the assigned agent status to 'stopped'
 * 3. Schedules a Google Calendar meeting using Composio
 * 4. Creates a meeting record in the database
 * 
 * Requires meetingId to identify the candidate and agent
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestContext = extractRequestContext(request);
  const requestId = logRequestStart({
    ...requestContext,
    path: '/api/candidates/accepted',
  });

  try {
    const body = await request.json();
    const { meetingId, scheduledTime } = body;
    
    console.log(`[${requestId}] 🎉 Candidate Acceptance Request:`, {
      meeting_id: meetingId,
      scheduled_time: scheduledTime,
    });

    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID is required' },
        { status: 400 }
      );
    }

    // Get meeting to find candidate and agent
    console.log(`[${requestId}] 🔍 Fetching meeting details...`);
    const meeting = await convexClient.query(api.meetings.getMeeting, {
      meetingId: meetingId as Id<'meetings'>,
    });

    if (!meeting) {
      console.error(`[${requestId}] ❌ Meeting not found: ${meetingId}`);
      logRequestError(requestId, `Meeting not found: ${meetingId}`, 404);
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      );
    }

    console.log(`[${requestId}] ✅ Meeting found:`, {
      meeting_id: meeting._id,
      status: meeting.status,
      candidate_id: meeting.candidateId,
      agent_id: meeting.agentId,
      campaign_id: meeting.campaignId,
    });

    const { candidateId, agentId, campaignId } = meeting;

    if (!candidateId || !agentId) {
      return NextResponse.json(
        { error: 'Meeting missing candidate or agent information' },
        { status: 400 }
      );
    }

    // Get candidate information
    console.log(`[${requestId}] 👤 Fetching candidate information...`);
    const candidates = await convexClient.query(api.candidates.getCandidatesByCampaign, {
      campaignId,
    });
    const candidate = candidates.find((c: any) => c._id === candidateId);

    if (!candidate) {
      console.error(`[${requestId}] ❌ Candidate not found: ${candidateId}`);
      logRequestError(requestId, `Candidate not found: ${candidateId}`, 404);
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 }
      );
    }

    console.log(`[${requestId}] ✅ Candidate found:`, {
      candidate_id: candidate._id,
      name: candidate.name,
      email: candidate.email,
      current_status: candidate.status,
    });

    if (!candidate.email) {
      console.error(`[${requestId}] ❌ Candidate email is missing`);
      logRequestError(requestId, 'Candidate email is required to schedule a meeting', 400);
      return NextResponse.json(
        { error: 'Candidate email is required to schedule a meeting' },
        { status: 400 }
      );
    }

    // Get campaign information for meeting details
    console.log(`[${requestId}] 📋 Fetching campaign information...`);
    const campaign = await convexClient.query(api.campaigns.getCampaign, {
      campaignId,
    });
    console.log(`[${requestId}] ✅ Campaign found:`, {
      campaign_id: campaign?._id,
      name: campaign?.name,
    });

    // Update candidate status to 'accepted'
    console.log(`[${requestId}] ✅ Updating candidate status to 'accepted'...`);
    await convexClient.mutation(api.candidates.updateCandidateStatus, {
      candidateId: candidateId as Id<'candidates'>,
      status: 'accepted',
    });
    console.log(`[${requestId}] ✅ Candidate status updated successfully`);

    // Update agent status to 'stopped'
    console.log(`[${requestId}] ⏹️  Updating agent status to 'stopped'...`);
    await convexClient.mutation(api.agents.updateAgentStatus, {
      agentId: agentId as Id<'agents'>,
      status: 'stopped',
    });
    console.log(`[${requestId}] ✅ Agent status updated successfully`);

    // Schedule Google Calendar meeting using Composio
    // Default to 2 days from now if no scheduledTime provided
    const defaultScheduledTime = scheduledTime || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    
    console.log(`[${requestId}] 📅 Scheduling Google Calendar meeting...`, {
      candidate_email: candidate.email,
      candidate_name: candidate.name,
      scheduled_time: defaultScheduledTime,
      duration_minutes: 30,
    });
    
    const calendarResult = await scheduleGoogleCalendarMeeting({
      candidateEmail: candidate.email,
      candidateName: candidate.name,
      startTime: defaultScheduledTime,
      durationMinutes: 30,
      title: `Final Interview - ${candidate.name}`,
      description: `Final stage interview for ${campaign?.name || 'Recruitment Campaign'}.\n\nCandidate: ${candidate.name}\nPosition: ${campaign?.name || 'Open Position'}`,
    });
    
    if (calendarResult.success) {
      console.log(`[${requestId}] ✅ Google Calendar meeting scheduled successfully:`, {
        event_id: calendarResult.eventId,
        meeting_link: calendarResult.meetingLink,
      });
    } else {
      console.error(`[${requestId}] ❌ Failed to schedule Google Calendar meeting:`, calendarResult.error);
    }

    // Calculate scheduled timestamp
    const scheduledTimestamp = new Date(defaultScheduledTime).getTime();

    // Create a new meeting record for the scheduled meeting
    let newMeetingId: Id<'meetings'> | null = null;
    if (calendarResult.success && scheduledTimestamp) {
      console.log(`[${requestId}] 💾 Creating meeting record in database...`);
      newMeetingId = await convexClient.mutation(api.meetings.createMeeting, {
        campaignId,
        candidateId: candidateId as Id<'candidates'>,
        agentId: agentId as Id<'agents'>,
        scheduledAt: scheduledTimestamp,
      });
      console.log(`[${requestId}] ✅ Meeting record created: ${newMeetingId}`);
    } else {
      console.warn(`[${requestId}] ⚠️  Skipping meeting record creation due to calendar scheduling failure`);
    }

    // Get updated agent info
    const agents = await convexClient.query(api.agents.getAgentsByCampaign, {
      campaignId,
    });
    const agent = agents?.find((a: any) => a._id === agentId);

    const response = {
      success: true,
      message: 'Candidate accepted, agent stopped, and meeting scheduled',
      candidate: {
        _id: candidateId,
        name: candidate.name,
        email: candidate.email,
        status: 'accepted',
      },
      agent: {
        _id: agentId,
        email: agent?.email,
        status: 'stopped',
      },
      meeting: {
        _id: meeting._id,
        status: meeting.status,
      },
      scheduledMeeting: calendarResult.success ? {
        _id: newMeetingId,
        scheduledAt: scheduledTimestamp,
        calendarEventId: calendarResult.eventId,
        meetingLink: calendarResult.meetingLink,
      } : null,
      calendarScheduleResult: calendarResult,
    };

    logRequestSuccess(requestId, 200, response, { duration: Date.now() - startTime });

    return NextResponse.json(response);

  } catch (error) {
    console.error(`[${requestId}] Error accepting candidate:`, error);
    logRequestError(requestId, error instanceof Error ? error : String(error), undefined, {
      duration: Date.now() - startTime,
    });
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Handle GET requests (for testing)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const meetingId = searchParams.get('meetingId');

  if (!meetingId) {
    return NextResponse.json(
      { error: 'Meeting ID is required as query parameter' },
      { status: 400 }
    );
  }

  // Reuse POST handler logic
  const body = { meetingId };
  const req = new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return POST(req);
}

