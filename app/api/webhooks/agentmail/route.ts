import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { mastra } from '@/src/mastra';
import { getMessage, replyToMessage, getThread, listMessages } from '@/lib/agentmail-client';
import { logRequestStart, logRequestSuccess, logRequestError, extractRequestContext } from '@/lib/logger';

const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * AgentMail Webhook Handler
 * 
 * Receives message.received events from AgentMail and processes them using Mastra agents
 * 
 * @see https://docs.agentmail.to/events
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestContext = extractRequestContext(request);
  const requestId = logRequestStart({
    ...requestContext,
    path: '/api/webhooks/agentmail',
  });

  try {
    const payload = await request.json();
    
    console.log(`[${requestId}] 📧 AgentMail Webhook Event:`, {
      event_type: payload.event_type,
      inbox_id: payload.message?.inbox_id,
      thread_id: payload.message?.thread_id,
      message_id: payload.message?.message_id,
    });
    
    // Verify the event type
    if (payload.event_type !== 'message.received') {
      console.log(`[${requestId}] ⚠️  Unsupported event type: ${payload.event_type}`);
      logRequestError(requestId, `Unsupported event type: ${payload.event_type}`, 400);
      return NextResponse.json(
        { error: 'Unsupported event type' },
        { status: 400 }
      );
    }

    const messageData = payload.message;
    const inbox_id = messageData.inbox_id;
    const thread_id = messageData.thread_id;
    const messageId = messageData.message_id;

    // Find the agent by inbox_id
    const agent = await convexClient.query(api.agents.getAgentByInboxId, {
      inboxId: inbox_id,
    });

    if (!agent) {
      console.error(`[${requestId}] ❌ Agent not found for inbox_id: ${inbox_id}`);
      logRequestError(requestId, `Agent not found for inbox_id: ${inbox_id}`, 404);
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    console.log(`[${requestId}] 🤖 Found agent:`, {
      agent_id: agent._id,
      agent_status: agent.status,
      campaign_id: agent.campaign?._id,
      candidate_name: agent.targetCandidate?.name,
    });

    // Check if agent is stopped - ignore callbacks if stopped
    if (agent.status === 'stopped') {
      console.log(`[${requestId}] ⏹️  Agent ${agent._id} is stopped, ignoring callback`);
      logRequestSuccess(requestId, 200, { message: 'Agent stopped, callback ignored' });
      return NextResponse.json({ success: true, message: 'Agent stopped, callback ignored' });
    }

    // Check if campaign is paused - ignore callbacks if paused
    if (agent.campaign?.persuasionAttackStatus === 'paused') {
      console.log(`[${requestId}] ⏸️  Campaign ${agent.campaign._id} is paused, ignoring callback`);
      logRequestSuccess(requestId, 200, { message: 'Campaign paused, callback ignored' });
      return NextResponse.json({ success: true, message: 'Campaign paused, callback ignored' });
    }

    // Validate agent has required context
    if (!agent.campaign || !agent.targetCandidate) {
      return NextResponse.json(
        { error: 'Agent missing campaign or candidate context' },
        { status: 500 }
      );
    }

    // Get the full message content
    console.log(`[${requestId}] 📥 Fetching full message content...`);
    const fullMessage = await getMessage(inbox_id, messageId);
    console.log(`[${requestId}] ✅ Message content retrieved:`, {
      from: fullMessage.from,
      subject: fullMessage.subject,
      text_length: fullMessage.text?.length || 0,
    });
    
    // Get all messages in the thread for context
    console.log(`[${requestId}] 📂 Fetching thread context...`);
    const thread = await getThread(inbox_id, thread_id);
    const allMessages = await listMessages(inbox_id);
    console.log(`[${requestId}] ✅ Thread context retrieved:`, {
      thread_subject: thread.subject,
      total_messages: allMessages.messages?.length || 0,
    });
    
    // Filter messages for this thread
    const threadMessages = (allMessages.messages || []).filter(
      (msg: any) => msg.thread_id === thread_id
    ).sort((a: any, b: any) => 
      new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
    );

    // Check for safe word "chris rock" (case insensitive)
    const messageText = (fullMessage.text || '').toLowerCase();
    const safeWord = 'chris rock';
    
    if (messageText.includes(safeWord)) {
      console.log(`[${requestId}] 🛑 Safe word detected in message!`);
      // Update agent status to stopped
      await convexClient.mutation(api.agents.updateAgentStatus, {
        agentId: agent._id,
        status: 'stopped',
      });
      
      console.log(`[${requestId}] ✅ Agent ${agent._id} status updated to stopped`);
      logRequestSuccess(requestId, 200, { message: 'Safe word detected, agent stopped' });
      
      return NextResponse.json({
        success: true,
        message: 'Safe word detected, agent stopped',
      });
    }

    // Prepare context for Mastra agent (use enriched data from query)
    const context = {
      campaign: {
        name: agent.campaign.name,
        jobDescription: agent.campaign.jobDescriptionSummary,
        perplexityResearch: agent.campaign.perplexityResearch,
        keywords: agent.campaign.keywords,
      },
      candidate: {
        name: agent.targetCandidate.name,
        email: agent.targetCandidate.email,
        title: agent.targetCandidate.title,
        company: agent.targetCandidate.company,
      },
      thread: {
        threadId: thread_id,
        subject: thread.subject,
        messages: threadMessages.map((msg: any) => ({
          id: msg.message_id,
          from: msg.from,
          to: msg.to,
          subject: msg.subject,
          text: msg.text,
          createdAt: msg.created_at,
        })),
      },
      currentMessage: {
        id: messageId,
        from: fullMessage.from,
        to: fullMessage.to,
        subject: fullMessage.subject,
        text: fullMessage.text,
        createdAt: fullMessage.created_at,
      },
    };

    // Use Mastra persuasion agent to generate response
    console.log(`[${requestId}] 🧠 Generating response using Mastra persuasion agent...`);
    const persuasionAgent = mastra.getAgent('persuasionEmailAgent');
    if (!persuasionAgent) {
      throw new Error('Persuasion email agent not found');
    }

    // Generate response using Mastra agent
    console.log(`[${requestId}] 💭 Generating AI response...`);
    const systemPrompt = `You are a persuasive recruitment agent. Write a SHORT, engaging email response to ${context.candidate.name} about the ${context.campaign.name} opportunity.

CANDIDATE: ${context.candidate.name}, ${context.candidate.title || ''} at ${context.candidate.company || ''}
OPPORTUNITY: ${context.campaign.name}

RECENT MESSAGE FROM CANDIDATE:
"${context.currentMessage.text}"

IMPORTANT:
- Keep it SHORT (100-200 words max)
- Be conversational and persuasive, not pushy
- Address their specific message with emotional intelligence
- End with a clear call to action

Write ONLY the email body text, nothing else. No subject, no JSON, no explanations.`;

    const response = await persuasionAgent.generate([
      {
        role: 'user',
        content: systemPrompt,
      },
    ]);

    let responseText = response.text || 'Thank you for your interest! Let me know if you have any questions.';
    
    // Clean up the response text - remove any JSON wrappers, markdown, or extra formatting
    responseText = responseText.trim();
    
    // Remove common wrapper patterns
    responseText = responseText.replace(/^```[\s\S]*?```/gm, ''); // Remove code blocks
    responseText = responseText.replace(/^"([\s\S]*)"$/s, '$1'); // Remove quotes
    responseText = responseText.replace(/^\{[\s\S]*"text"\s*:\s*"([\s\S]*)"[\s\S]*\}$/s, '$1'); // Remove JSON wrapper
    responseText = responseText.trim();
    
    console.log(`[${requestId}] ✅ AI response generated (${responseText.length} characters)`);

    // Check if candidate agreed, wants to schedule, or rejected
    const candidateText = (context.currentMessage.text || '').toLowerCase();
    const agreedIndicators = ['yes', 'interested', 'sounds great', 'let\'s do it', 'i\'m in', 'i accept', 'i agree'];
    const scheduleIndicators = ['schedule', 'meeting', 'call', 'discuss', 'talk', 'interview'];
    const rejectedIndicators = ['not interested', 'no thanks', 'no thank you', 'decline', 'pass', 'not a fit', "don't contact me"];
    
    const hasAgreed = agreedIndicators.some(indicator => candidateText.includes(indicator));
    const wantsToSchedule = scheduleIndicators.some(indicator => candidateText.includes(indicator));
    const hasRejected = rejectedIndicators.some(indicator => candidateText.includes(indicator));

    // Update agent status based on response
    if (hasAgreed) {
      console.log(`[${requestId}] ✅ Candidate agreed! Updating agent status to 'completed'`);
      await convexClient.mutation(api.agents.updateAgentStatus, {
        agentId: agent._id,
        status: 'completed',
      });
    } else if (hasRejected) {
      console.log(`[${requestId}] 🛑 Candidate rejected! Updating agent status to 'stopped'`);
      await convexClient.mutation(api.agents.updateAgentStatus, {
        agentId: agent._id,
        status: 'stopped',
      });
      // Don't send a reply if they rejected
      logRequestSuccess(requestId, 200, {
        message: 'Candidate rejected, agent stopped',
        agentStatus: 'stopped',
      }, { duration: Date.now() - startTime });
      return NextResponse.json({
        success: true,
        message: 'Candidate rejected, agent stopped',
        agentStatus: 'stopped',
      });
    } else if (wantsToSchedule) {
      console.log(`[${requestId}] 📅 Candidate wants to schedule. Updating agent status to 'scheduling'`);
      // Keep as active, will schedule meeting
      await convexClient.mutation(api.agents.updateAgentStatus, {
        agentId: agent._id,
        status: 'scheduling',
      });
    } else {
      console.log(`[${requestId}] 💬 Continuing conversation. Agent status remains: ${agent.status}`);
    }

    // Reply to the message
    console.log(`[${requestId}] 📤 Sending reply email...`);
    const reply = await replyToMessage(inbox_id, messageId, {
      text: responseText,
    });
    console.log(`[${requestId}] ✅ Reply sent successfully:`, {
      reply_id: reply.message_id,
      thread_id: thread_id,
    });

    logRequestSuccess(requestId, 200, {
      message: 'Response sent successfully',
      replyId: reply.message_id,
      agentStatus: agent.status,
    }, { duration: Date.now() - startTime });

    return NextResponse.json({
      success: true,
      message: 'Response sent successfully',
      replyId: reply.message_id,
      agentStatus: agent.status,
    });

  } catch (error) {
    console.error(`[${requestId}] Error processing AgentMail webhook:`, error);
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

// Handle GET requests (for webhook verification if needed)
export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'AgentMail webhook endpoint' });
}

