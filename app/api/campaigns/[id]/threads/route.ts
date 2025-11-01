import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { listThreads, listMessages } from '@/lib/agentmail-client';

/**
 * Get Campaign Threads API Route
 * 
 * Fetches all email threads and messages for a campaign from AgentMail:
 * 1. Gets all agents for the campaign from Convex
 * 2. Fetches threads and messages from AgentMail for each inbox
 * 3. Maps the data to our format
 * 4. Returns combined threads sorted by most recent activity
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: campaignId } = await params;

  try {
    // Validate environment variable
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      console.error('NEXT_PUBLIC_CONVEX_URL is not set');
      return NextResponse.json(
        { error: 'Server configuration error: Convex URL not configured' },
        { status: 500 }
      );
    }

    const convexClient = new ConvexHttpClient(convexUrl);

    // Get all agents for this campaign
    const agents = await convexClient.query(api.agents.getAgentsByCampaign, {
      campaignId: campaignId as any,
    });

    if (!agents || agents.length === 0) {
      return NextResponse.json({ threads: [] });
    }

    const allThreads: Array<{
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
    }> = [];

    // Fetch threads for each agent inbox
    for (const agent of agents) {
      if (!agent.inboxId || !agent.targetCandidate?.email) {
        continue;
      }

      try {
        // Fetch all threads for this inbox
        const threadsData = await listThreads(agent.inboxId);

        // Fetch messages for each thread
        for (const thread of threadsData.threads) {
          try {
            // Fetch all messages for this inbox
            const messagesData = await listMessages(agent.inboxId);

            // Filter messages for this thread
            const threadMessages = messagesData.messages
              .filter((msg) => msg.thread_id === thread.thread_id)
              .sort((a, b) => {
                const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
                const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
                return timeA - timeB;
              });

            // Map messages to our format
            const mappedMessages = threadMessages.map((msg) => {
              const sentByAgent = msg.from.toLowerCase() === agent.email.toLowerCase();
              return {
                messageId: msg.message_id,
                from: msg.from,
                to: msg.to,
                content: msg.text || msg.html || '',
                sentByAgent,
                createdAt: msg.created_at || '',
              };
            });

            // Determine the other participant (not the agent)
            const participants = thread.participants.filter(
              (p) => p.toLowerCase() !== agent.email.toLowerCase()
            );
            const participantEmail = participants[0] || agent.targetCandidate.email;
            const participantName = agent.targetCandidate.name;

            // Determine status based on messages
            let status = 'active';
            if (mappedMessages.length === 0) {
              status = 'waiting';
            } else {
              const lastMessage = mappedMessages[mappedMessages.length - 1];
              if (lastMessage.sentByAgent) {
                status = 'waiting';
              } else {
                status = 'active';
              }
            }

            // Get the last message timestamp
            const lastMessageAt = mappedMessages.length > 0
              ? mappedMessages[mappedMessages.length - 1].createdAt
              : thread.created_at || '';

            allThreads.push({
              threadId: thread.thread_id,
              subject: thread.subject,
              participantName,
              participantEmail,
              messageCount: mappedMessages.length,
              lastMessageAt,
              status,
              messages: mappedMessages,
            });
          } catch (error) {
            console.error(`Error fetching messages for thread ${thread.thread_id}:`, error);
          }
        }
      } catch (error) {
        console.error(`Error fetching threads for agent ${agent._id}:`, error);
      }
    }

    // Sort threads by last message time (most recent first)
    allThreads.sort((a, b) => {
      const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return timeB - timeA;
    });

    return NextResponse.json({ threads: allThreads });
  } catch (error) {
    console.error('Error fetching campaign threads:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch threads' },
      { status: 500 }
    );
  }
}

