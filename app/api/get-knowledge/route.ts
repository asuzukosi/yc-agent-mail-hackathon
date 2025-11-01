import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { mastra } from '@/src/mastra';
import { Id } from '@/convex/_generated/dataModel';
import { logRequestStart, logRequestSuccess, logRequestError, extractRequestContext } from '@/lib/logger';

const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * knowledge search endpoint
 * 
 * receives a query and returns a response based on campaign and candidate context
 * uses mastra agent to generate intelligent responses
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestContext = extractRequestContext(request);
  const requestId = logRequestStart({
    ...requestContext,
    path: '/api/get-knowledge',
  });

  try {
    const body = await request.json();
    const { query, campaignId } = body;
    
    console.log(`[${requestId}] 📚 Knowledge Query:`, {
      query: query?.substring(0, 100),
      campaign_id: campaignId,
    });

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    // Get campaign information
    console.log(`[${requestId}] 📋 Fetching campaign information...`);
    const campaign = await convexClient.query(api.campaigns.getCampaign, {
      campaignId: campaignId as Id<'campaigns'>,
    });

    if (!campaign) {
      console.error(`[${requestId}] ❌ Campaign not found: ${campaignId}`);
      logRequestError(requestId, `Campaign not found: ${campaignId}`, 404);
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    console.log(`[${requestId}] ✅ Campaign found:`, {
      campaign_id: campaign._id,
      name: campaign.name,
    });

    // Get all candidates for the campaign
    console.log(`[${requestId}] 👥 Fetching candidates...`);
    const candidates = await convexClient.query(api.candidates.getCandidatesByCampaign, {
      campaignId: campaignId as Id<'campaigns'>,
    });
    console.log(`[${requestId}] ✅ Found ${candidates.length} candidates`);

    // Get all agents for the campaign
    console.log(`[${requestId}] 🤖 Fetching agents...`);
    const agents = await convexClient.query(api.agents.getAgentsByCampaign, {
      campaignId: campaignId as Id<'campaigns'>,
    });
    console.log(`[${requestId}] ✅ Found ${agents?.length || 0} agents`);

    // Prepare context for Mastra agent
    const context = {
      campaign: {
        name: campaign.name,
        jobDescription: campaign.jobDescriptionSummary,
        perplexityResearch: campaign.perplexityResearch,
        keywords: campaign.keywords?.split(',').map(k => k.trim()) || [],
        createdAt: campaign.createdAt,
      },
      candidates: (candidates || []).map((candidate: any) => ({
        name: candidate.name,
        email: candidate.email,
        title: candidate.title,
        company: candidate.company,
        linkedinUrl: candidate.linkedinUrl,
      })),
      agents: (agents || []).map((agent: any) => ({
        email: agent.email,
        status: agent.status,
        targetCandidate: agent.targetCandidate?.name,
      })),
    };

    // get or create a knowledge agent (we can use the persuasion agent or create a new one)
    // for now, let's use the persuasionEmailAgent or create a simple query agent
    const knowledgeAgent = mastra.getAgent('persuasionEmailAgent');
    
    if (!knowledgeAgent) {
      return NextResponse.json(
        { error: 'Knowledge agent not available' },
        { status: 500 }
      );
    }

    // build the system prompt with full context
    const systemPrompt = `You are a knowledgeable recruitment assistant with access to comprehensive campaign and candidate information.

CAMPAIGN CONTEXT:
- Campaign Name: ${context.campaign.name}
- Job Description: ${context.campaign.jobDescription}
- Market Research: ${context.campaign.perplexityResearch}
- Keywords: ${context.campaign.keywords.join(', ')}

CANDIDATES (${context.candidates.length} total):
${context.candidates.map((candidate: any, idx: number) => `
${idx + 1}. ${candidate.name}
   - Email: ${candidate.email || 'Not provided'}
   - Title: ${candidate.title || 'Not specified'}
   - Company: ${candidate.company || 'Not specified'}
   - LinkedIn: ${candidate.linkedinUrl || 'Not provided'}
`).join('\n')}

AGENTS (${context.agents.length} total):
${context.agents.map((agent: any, idx: number) => `
${idx + 1}. Agent Email: ${agent.email}
   - Status: ${agent.status}
   - Target: ${agent.targetCandidate || 'Not assigned'}
`).join('\n')}

USER QUERY: ${query}

Your task:
1. Answer the query using the provided campaign and candidate context
2. Be specific and reference actual data when relevant
3. Provide insights based on the market research and job description
4. If the query is about candidates, provide relevant details
5. If the query is about the campaign, reference the job description and research
6. Be concise but informative
7. If information is not available, say so clearly

Provide a helpful, accurate response based on the context above.`;

    // Generate response using Mastra agent
    console.log(`[${requestId}] 🧠 Generating AI response using Mastra agent...`);
    const response = await knowledgeAgent.generate([
      {
        role: 'user',
        content: systemPrompt,
      },
    ]);

    const answer = response.text || 'I apologize, but I could not generate a response at this time.';
    console.log(`[${requestId}] ✅ AI response generated (${answer.length} characters)`);

    const result = {
      success: true,
      query,
      answer,
      context: {
        campaignName: context.campaign.name,
        candidateCount: context.candidates.length,
        agentCount: context.agents.length,
      },
    };

    logRequestSuccess(requestId, 200, result, { duration: Date.now() - startTime });

    return NextResponse.json(result);

  } catch (error) {
    console.error(`[${requestId}] Error processing knowledge query:`, error);
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
  const query = searchParams.get('query');
  const campaignId = searchParams.get('campaignId');

  if (!query || !campaignId) {
    return NextResponse.json(
      { error: 'Query and campaignId are required as query parameters' },
      { status: 400 }
    );
  }

  // Reuse POST handler logic
  const body = { query, campaignId };
  const req = new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return POST(req);
}

