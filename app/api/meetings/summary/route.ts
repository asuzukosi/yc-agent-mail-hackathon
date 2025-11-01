import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { logRequestStart, logRequestSuccess, logRequestError, extractRequestContext } from '@/lib/logger';

const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Send Meeting Summary Endpoint
 * 
 * Updates the summary field of a meeting based on the meeting ID
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestContext = extractRequestContext(request);
  const requestId = logRequestStart({
    ...requestContext,
    path: '/api/meetings/summary',
  });

  try {
    const body = await request.json();
    const { meetingId, summary } = body;
    
    console.log(`[${requestId}] 📝 Meeting Summary Request:`, {
      meeting_id: meetingId,
      summary_length: summary?.length || 0,
    });

    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID is required' },
        { status: 400 }
      );
    }

    if (!summary) {
      return NextResponse.json(
        { error: 'Summary is required' },
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
      candidate: meeting.candidate?.name,
    });

    // Update meeting summary
    console.log(`[${requestId}] 💾 Updating meeting summary...`);
    await convexClient.mutation(api.meetings.updateMeetingSummary, {
      meetingId: meetingId as Id<'meetings'>,
      summary: summary,
    });
    console.log(`[${requestId}] ✅ Meeting summary updated successfully`);

    // Get updated meeting
    const updatedMeeting = await convexClient.query(api.meetings.getMeeting, {
      meetingId: meetingId as Id<'meetings'>,
    });

    const response = {
      success: true,
      message: 'Meeting summary updated successfully',
      meeting: {
        _id: updatedMeeting?._id,
        summary: updatedMeeting?.summary,
        status: updatedMeeting?.status,
      },
    };

    logRequestSuccess(requestId, 200, response, { duration: Date.now() - startTime });

    return NextResponse.json(response);

  } catch (error) {
    console.error(`[${requestId}] Error updating meeting summary:`, error);
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
  const summary = searchParams.get('summary');

  if (!meetingId || !summary) {
    return NextResponse.json(
      { error: 'Meeting ID and summary are required as query parameters' },
      { status: 400 }
    );
  }

  // Reuse POST handler logic
  const body = { meetingId, summary };
  const req = new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return POST(req);
}

