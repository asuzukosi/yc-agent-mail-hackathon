import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { logRequestStart, logRequestSuccess, logRequestError, extractRequestContext } from '@/lib/logger';

const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * End Meeting Endpoint
 * 
 * Sets the status of a meeting to 'completed'
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestContext = extractRequestContext(request);
  const requestId = logRequestStart({
    ...requestContext,
    path: '/api/meetings/end',
  });

  try {
    const body = await request.json();
    const { meetingId } = body;
    
    console.log(`[${requestId}] 🏁 Ending Meeting Request:`, { meeting_id: meetingId });

    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID is required' },
        { status: 400 }
      );
    }

    // Verify meeting exists
    console.log(`[${requestId}] 🔍 Fetching meeting...`);
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
      current_status: meeting.status,
      candidate: meeting.candidate?.name,
    });

    // Check if meeting is already completed
    if (meeting.status === 'completed') {
      console.log(`[${requestId}] ℹ️  Meeting is already completed`);
      logRequestSuccess(requestId, 200, { message: 'Meeting is already completed', meeting });
      return NextResponse.json(
        { 
          success: true,
          message: 'Meeting is already completed',
          meeting,
        },
        { status: 200 }
      );
    }

    // Update meeting status to completed
    console.log(`[${requestId}] 📝 Updating meeting status to 'completed'...`);
    const result = await convexClient.mutation(api.meetings.updateMeetingStatus, {
      meetingId: meetingId as Id<'meetings'>,
      status: 'completed',
    });
    console.log(`[${requestId}] ✅ Meeting status updated successfully`);

    // Get updated meeting
    const updatedMeeting = await convexClient.query(api.meetings.getMeeting, {
      meetingId: meetingId as Id<'meetings'>,
    });

    const response = {
      success: true,
      message: 'Meeting marked as completed',
      meeting: updatedMeeting,
    };

    logRequestSuccess(requestId, 200, response, { duration: Date.now() - startTime });

    return NextResponse.json(response);

  } catch (error) {
    console.error(`[${requestId}] Error ending meeting:`, error);
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

