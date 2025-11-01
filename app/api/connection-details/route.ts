import { NextRequest, NextResponse } from 'next/server';
import { AccessToken, type AccessTokenOptions, type VideoGrant } from 'livekit-server-sdk';
import { RoomConfiguration } from '@livekit/protocol';
import { logRequestStart, logRequestSuccess, logRequestError, extractRequestContext } from '@/lib/logger';

type ConnectionDetails = {
  serverUrl: string;
  roomName: string;
  participantName: string;
  participantToken: string;
};

// NOTE: you are expected to define the following environment variables in `.env.local`:
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

// don't cache the results
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestContext = extractRequestContext(req as any);
  const requestId = logRequestStart({
    ...requestContext,
    path: '/api/connection-details',
  });

  try {
    console.log(`[${requestId}] 🎥 LiveKit Connection Request`);
    if (LIVEKIT_URL === undefined) {
      throw new Error('LIVEKIT_URL is not defined');
    }
    if (API_KEY === undefined) {
      throw new Error('LIVEKIT_API_KEY is not defined');
    }
    if (API_SECRET === undefined) {
      throw new Error('LIVEKIT_API_SECRET is not defined');
    }

    // Parse agent configuration from request body
    const body = await req.json();
    const agentName: string = body?.room_config?.agents?.[0]?.agent_name;
    
    console.log(`[${requestId}] 🔑 Generating LiveKit connection details:`, {
      agent_name: agentName,
      has_room_config: !!body?.room_config,
    });

    // Generate participant token
    const participantName = 'user';
    const participantIdentity = `voice_assistant_user_${Math.floor(Math.random() * 10_000)}`;
    const roomName = `voice_assistant_room_${Math.floor(Math.random() * 10_000)}`;

    console.log(`[${requestId}] 🎲 Generated session details:`, {
      participant_identity: participantIdentity,
      room_name: roomName,
    });

    const participantToken = await createParticipantToken(
      { identity: participantIdentity, name: participantName },
      roomName,
      agentName
    );

    console.log(`[${requestId}] ✅ Participant token generated successfully`);

    // Return connection details
    const data: ConnectionDetails = {
      serverUrl: LIVEKIT_URL,
      roomName,
      participantToken: participantToken,
      participantName,
    };
    const headers = new Headers({
      'Cache-Control': 'no-store',
    });
    
    logRequestSuccess(requestId, 200, {
      roomName,
      participantName,
      hasToken: !!participantToken,
    }, { duration: Date.now() - startTime });

    return NextResponse.json(data, { headers });
  } catch (error) {
    if (error instanceof Error) {
      console.error(`[${requestId}] Error generating LiveKit connection:`, error);
      logRequestError(requestId, error, undefined, { duration: Date.now() - startTime });
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    logRequestError(requestId, 'An unknown error occurred', undefined, { duration: Date.now() - startTime });
    return NextResponse.json(
      { error: 'An unknown error occurred' },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

function createParticipantToken(
  userInfo: AccessTokenOptions,
  roomName: string,
  agentName?: string
): Promise<string> {
  const at = new AccessToken(API_KEY, API_SECRET, {
    ...userInfo,
    ttl: '15m',
  });
  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  };
  at.addGrant(grant);

  if (agentName) {
    at.roomConfig = new RoomConfiguration({
      agents: [{ agentName }],
    });
  }

  return at.toJwt();
}

