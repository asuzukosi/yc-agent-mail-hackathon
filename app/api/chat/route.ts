import { NextRequest, NextResponse } from 'next/server';
import { logRequestStart, logRequestSuccess, logRequestError, extractRequestContext } from '@/lib/logger';
import { mastra } from '@/src/mastra';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestContext = extractRequestContext(request);
  const requestId = logRequestStart({
    ...requestContext,
    path: '/api/chat',
  });

  try {
    const { message, campaignId, history } = await request.json();
    
    console.log(`[${requestId}] 💬 Chat Request:`, {
      message_length: message?.length || 0,
      campaign_id: campaignId,
      history_length: history?.length || 0,
    });

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Get the campaign assistant agent from Mastra
    const campaignAssistantAgent = mastra.getAgent('campaignAssistantAgent');
    if (!campaignAssistantAgent) {
      throw new Error('Campaign assistant agent not found');
    }

    // Add campaign context to the message if campaignId is provided
    let userMessage = message;
    if (campaignId) {
      userMessage = `[Campaign ID: ${campaignId}]\n\n${message}`;
    }

    // Build conversation history for Mastra agent
    // Convert history to Mastra format (array of messages with role and content)
    const finalMessages = [
      ...(history || []).map((msg: any) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      })),
      {
        role: 'user' as const,
        content: userMessage,
      },
    ];

    console.log(`[${requestId}] 🤖 Generating AI response using Mastra campaign assistant agent...`);

    // Generate response using Mastra agent
    // The Hyperspell tool will automatically use the HYPERSPELL_API_KEY environment variable
    const response = await campaignAssistantAgent.generate(finalMessages);

    const responseText = response.text || 'Sorry, I could not generate a response.';
    console.log(`[${requestId}] ✅ AI response generated (${responseText.length} characters)`);

    const result = { response: responseText };
    logRequestSuccess(requestId, 200, result, { duration: Date.now() - startTime });

    return NextResponse.json(result);
  } catch (error) {
    console.error(`[${requestId}] Chat API error:`, error);
    logRequestError(requestId, error instanceof Error ? error : String(error), undefined, {
      duration: Date.now() - startTime,
    });
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}

