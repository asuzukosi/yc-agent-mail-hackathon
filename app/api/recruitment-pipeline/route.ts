import { NextRequest } from 'next/server';
import { mastra } from '@/src/mastra/index';
import { processJobDescriptionTool } from '@/src/mastra/tools/process-job-description-tool';
import { researchWithPerplexity } from '@/lib/perplexity-client';
// import { searchLinkedInManual } from '@/lib/browser-use-client'; // Dynamic import below to avoid zod version conflicts
import { findEmailsForCandidates } from '@/lib/sixtyfour-client';
import { RuntimeContext } from '@mastra/core/di';
import { api } from '@/convex/_generated/api';
import { ConvexHttpClient } from 'convex/browser';
import { logRequestStart, logRequestError, extractRequestContext } from '@/lib/logger';

export const maxDuration = 300; // 5 minutes max duration
export const runtime = 'nodejs';

interface PipelineProgress {
  step: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  message?: string;
  data?: any;
  timestamp: number;
}

/**
 * Send progress update via Server-Sent Events
 */
function sendProgress(
  controller: ReadableStreamDefaultController,
  progress: PipelineProgress,
) {
  const data = JSON.stringify(progress);
  controller.enqueue(
    new TextEncoder().encode(`data: ${data}\n\n`),
  );
}

/**
 * Send final result via Server-Sent Events
 */
function sendFinal(
  controller: ReadableStreamDefaultController,
  result: {
    success: boolean;
    campaignId?: string;
    candidates?: any[];
    error?: string;
  },
) {
  const data = JSON.stringify({ type: 'final', ...result });
  controller.enqueue(
    new TextEncoder().encode(`data: ${data}\n\n`),
  );
  controller.close();
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestContext = extractRequestContext(request);
  const requestId = logRequestStart({
    ...requestContext,
    path: '/api/recruitment-pipeline',
  });

  const stream = new ReadableStream({
    async start(controller) {
      try {
        console.log(`[${requestId}] 🚀 Starting Recruitment Pipeline...`);
        
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const campaignName = formData.get('campaignName') as string;
        
        console.log(`[${requestId}] 📋 Pipeline Request Details:`, {
          has_file: !!file,
          file_name: file?.name,
          file_size: file?.size,
          campaign_name: campaignName,
        });

        if (!file) {
          console.error(`[${requestId}] ❌ No file provided`);
          sendFinal(controller, {
            success: false,
            error: 'No file provided',
          });
          return;
        }

        if (!campaignName) {
          console.error(`[${requestId}] ❌ Campaign name is required`);
          sendFinal(controller, {
            success: false,
            error: 'Campaign name is required',
          });
          return;
        }

        const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
        if (!convexUrl) {
          sendFinal(controller, {
            success: false,
            error: 'NEXT_PUBLIC_CONVEX_URL is not set',
          });
          return;
        }

        const convexClient = new ConvexHttpClient(convexUrl);

        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const pdfBuffer = Buffer.from(arrayBuffer);

        try {
          console.log(`[${requestId}] [Pipeline] Starting pipeline execution`);
          console.log(`[${requestId}] [Pipeline] Campaign: ${campaignName}`);

          // Step 1: Process job description PDF → Extract recruitment-relevant information
          console.log(`[${requestId}] [Step 1/7] Processing PDF...`);
          sendProgress(controller, {
            step: 'processing-pdf',
            status: 'processing',
            message: 'Processing PDF and extracting recruitment information...',
            timestamp: Date.now(),
          });

          const pdfResult = await processJobDescriptionTool.execute({
            context: { pdfBuffer },
            mastra,
            runtimeContext: new RuntimeContext(),
          });

          const jobDescriptionSummary = pdfResult.recruitmentInfo;

          console.log(`[${requestId}] [Step 1/7] ✅ Completed: Extracted ${pdfResult.pagesCount} pages, ${pdfResult.characterCount} characters`);
          sendProgress(controller, {
            step: 'processing-pdf',
            status: 'completed',
            message: `Extracted ${pdfResult.pagesCount} pages and ${pdfResult.characterCount} characters`,
            data: { pages: pdfResult.pagesCount, characters: pdfResult.characterCount },
            timestamp: Date.now(),
          });

          // Step 2: Send extracted info to Perplexity → Get additional market research
          console.log(`[${requestId}] [Step 2/7] Researching with Perplexity...`);
          sendProgress(controller, {
            step: 'researching-perplexity',
            status: 'processing',
            message: 'Researching market trends and skills with Perplexity AI...',
            timestamp: Date.now(),
          });

          const perplexityResult = await researchWithPerplexity(
            jobDescriptionSummary,
          );
          const perplexityResearch = perplexityResult.content;

          console.log(`[Step 2/7] ✅ Completed: Market research completed (${perplexityResearch.length} characters)`);
          sendProgress(controller, {
            step: 'researching-perplexity',
            status: 'completed',
            message: `Completed market research (${Math.round(perplexityResearch.length / 1000)}K characters)`,
            data: { researchLength: perplexityResearch.length },
            timestamp: Date.now(),
          });

          // Step 3: Combine extracted info + Perplexity research
          const enrichedContext = `${jobDescriptionSummary}\n\n--- Additional Market Research ---\n\n${perplexityResearch}`;

          // Step 4: Use Mastra again → Extract LinkedIn search queries
          console.log('[Step 3/7] Extracting LinkedIn search queries...');
          sendProgress(controller, {
            step: 'extracting-queries',
            status: 'processing',
            message: 'Generating LinkedIn search queries from enriched context...',
            timestamp: Date.now(),
          });

          const linkedinQueryAgent = mastra.getAgent('linkedinQueryExtractionAgent');
          if (!linkedinQueryAgent) {
            throw new Error('LinkedIn query extraction agent not found');
          }

          const queryResult = await linkedinQueryAgent.generate([
            {
              role: 'user',
              content: `You are generating highly targeted, domain-specific LinkedIn search queries for a recruitment pipeline.

**CONTEXT:**
Below is the enriched job description context, including the original job description extraction and Perplexity market research.

**YOUR TASK:**
Generate 3-5 highly specific, domain-targeted LinkedIn search queries that will find candidates with EXACT relevance to this role.

**REQUIREMENTS:**
1. Each query MUST combine multiple specific elements: job title + technologies + domain/industry + experience level
2. Do NOT use generic terms like "Software Engineer" alone - always combine with specific context
3. Extract specific technologies, tools, frameworks mentioned in both the job description and market research
4. Include industry/domain keywords (e.g., FinTech, Healthcare, SaaS, E-commerce)
5. Match the experience level and seniority requirements
6. Use insights from the Perplexity research about trending skills and market demands
7. Each query should be 5-15 words and highly targeted

**FORMAT:**
Provide your queries in this exact format:
**Primary Search Query 1:**
[Specific query here]

**Primary Search Query 2:**
[Specific query here]

...and so on

**ENRICHED JOB DESCRIPTION CONTEXT:**
${enrichedContext}

Generate the queries now, ensuring they are highly targeted and domain-specific.`,
            },
          ]);

          // Parse the queries from the agent response
          const queryText = queryResult.text || '';
          const allSearchQueries = extractSearchQueries(queryText);
          
          // For demo: Limit to top 2 queries to reduce query time
          const searchQueries = allSearchQueries.slice(0, 2);
          console.log(`[${requestId}] [Step 3/7] Demo mode: Limited to top 2 queries (was ${allSearchQueries.length})`);

          console.log(`[${requestId}] [Step 3/7] ✅ Completed: Generated ${searchQueries.length} search queries`);
          sendProgress(controller, {
            step: 'extracting-queries',
            status: 'completed',
            message: `Generated ${searchQueries.length} LinkedIn search queries (top 2 for demo)`,
            data: { queryCount: searchQueries.length, queries: searchQueries },
            timestamp: Date.now(),
          });

          // Step 5: Use Browser Use → Search LinkedIn and scrape candidate profiles
          console.log(`[${requestId}] [Step 4/7] Searching LinkedIn with ${searchQueries.length} queries...`);
          sendProgress(controller, {
            step: 'searching-linkedin',
            status: 'processing',
            message: `Searching LinkedIn for candidates using ${searchQueries.length} search queries...`,
            timestamp: Date.now(),
          });

          // Dynamic import to avoid zod version conflicts during build
          const { searchLinkedInManual } = await import('@/lib/browser-use-client');
          const allLinkedInCandidates = await searchLinkedInManual(searchQueries);

          console.log(`[${requestId}] [Step 4/7] ✅ Completed: Found ${allLinkedInCandidates.length} candidates`);
          
          // For demo: Shuffle and pick only first 5 candidates
          const shuffledCandidates = [...allLinkedInCandidates].sort(() => Math.random() - 0.5);
          const linkedInCandidates = shuffledCandidates.slice(0, 5);
          console.log(`[${requestId}] [Step 4/7] Demo mode: Shuffled and selected top 5 candidates from ${allLinkedInCandidates.length} total`);
          
          // Extract candidate names for display
          const candidateNames = linkedInCandidates
            .map((c) => c.name)
            .filter((name) => name && name.trim());
          
          const namesText =
            candidateNames.length > 0
              ? candidateNames.join(', ')
              : 'No candidates found';
          
          sendProgress(controller, {
            step: 'searching-linkedin',
            status: 'completed',
            message: `Found ${allLinkedInCandidates.length} candidates, selected top 5 for demo: ${namesText}`,
            data: {
              candidateCount: linkedInCandidates.length,
              totalCount: allLinkedInCandidates.length,
              candidateNames: candidateNames,
            },
            timestamp: Date.now(),
          });

          // Step 6: Use SixtyFour API → Find emails for each candidate
          console.log(`[${requestId}] [Step 5/7] Enriching emails for ${linkedInCandidates.length} candidates (demo: first 5 only)...`);
          sendProgress(controller, {
            step: 'enriching-emails',
            status: 'processing',
            message: `Enriching candidate emails with SixtyFour AI (first 5 candidates for demo purposes)...`,
            timestamp: Date.now(),
          });

          const enrichedCandidates = await findEmailsForCandidates(
            linkedInCandidates,
            (progress, total, candidateName, emailFound) => {
              // Send progress update for each candidate
              const statusText = emailFound 
                ? `${candidateName} - email found ✅`
                : `${candidateName} - no email found`;
              
              sendProgress(controller, {
                step: 'enriching-emails',
                status: 'processing',
                message: `Fetching emails for first 5 candidates (demo): ${statusText} (${progress}/${total})`,
                data: {
                  progress,
                  total,
                  currentCandidate: candidateName,
                  emailFound,
                  completedCandidates: progress,
                },
                timestamp: Date.now(),
              });
            },
          );

          const enrichedCount = enrichedCandidates.filter((c) => c.email).length;
          const enrichedNames = enrichedCandidates
            .filter((c) => c.email)
            .map((c) => c.name);
          const noEmailNames = enrichedCandidates
            .filter((c) => !c.email)
            .map((c) => c.name);
          
          let completionMessage = `Enriched ${enrichedCount} out of ${linkedInCandidates.length} candidate emails`;
          if (enrichedNames.length > 0) {
            completionMessage += `\n✅ Email found: ${enrichedNames.join(', ')}`;
          }
          if (noEmailNames.length > 0) {
            completionMessage += `\n⚠️ No email: ${noEmailNames.join(', ')}`;
          }
          
          console.log(`[${requestId}] [Step 5/7] ✅ Completed: Enriched ${enrichedCount}/${linkedInCandidates.length} candidate emails`);
          sendProgress(controller, {
            step: 'enriching-emails',
            status: 'completed',
            message: completionMessage,
            data: { enrichedCount, totalCount: linkedInCandidates.length, enrichedNames, noEmailNames },
            timestamp: Date.now(),
          });

          // Step 7: Store campaign and candidates in Convex
          console.log(`[${requestId}] [Step 6/7] Storing data in database...`);
          sendProgress(controller, {
            step: 'storing-data',
            status: 'processing',
            message: `Storing campaign and ${enrichedCandidates.length} candidates in database...`,
            timestamp: Date.now(),
          });

          const campaignId = await convexClient.mutation(
            api.campaigns.createCampaign,
            {
              name: campaignName,
              jobDescriptionSummary,
              perplexityResearch,
              keywords: searchQueries.join(', '),
            },
          );

          await convexClient.mutation(api.candidates.createCandidates, {
            campaignId,
            candidates: enrichedCandidates.map((c) => ({
              name: c.name,
              email: c.email,
              linkedinUrl: c.linkedinUrl,
              title: c.title,
              company: c.company,
            })),
          });

          console.log(`[${requestId}] [Step 6/7] ✅ Completed: Data stored successfully (Campaign ID: ${campaignId})`);
          sendProgress(controller, {
            step: 'storing-data',
            status: 'completed',
            message: `Data stored successfully in campaign ${campaignId}`,
            data: { campaignId },
            timestamp: Date.now(),
          });

          console.log(`[${requestId}] [Step 7/7] ✅ Pipeline completed successfully`);
          sendProgress(controller, {
            step: 'complete',
            status: 'completed',
            message: 'Pipeline completed successfully',
            data: {
              campaignId,
              candidateCount: enrichedCandidates.length,
            },
            timestamp: Date.now(),
          });

          sendFinal(controller, {
            success: true,
            campaignId,
            candidates: enrichedCandidates,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          console.error('[Pipeline] ❌ Error:', error);

          // Find the last processing step and mark it as error
          sendProgress(controller, {
            step: 'error',
            status: 'error',
            message: `Pipeline error: ${errorMessage}`,
            timestamp: Date.now(),
          });

          sendFinal(controller, {
            success: false,
            error: errorMessage,
          });
        }
      } catch (error) {
        console.error('[Pipeline] Request error:', error);
        sendFinal(controller, {
          success: false,
          error:
            error instanceof Error ? error.message : 'Unknown error occurred',
        });
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

function extractSearchQueries(queryText: string): string[] {
  // Note: Query extraction logs don't include requestId as this is a helper function
  // that may be called from multiple contexts
  console.log(`[Query Extraction] Parsing query text (${queryText.length} characters)`);
  console.log(`[Query Extraction] Query text preview: ${queryText.substring(0, 300)}...`);
  
  const queries: string[] = [];

  // Pattern 1: Look for "Primary Search Query X:" or "**Primary Search Query X:**" format
  const primaryQueryPattern = /(?:\*\*)?Primary\s+Search\s+Query\s+\d+:\s*\*\*?\s*(.+?)(?=\n\*\*?Primary\s+Search\s+Query\s+\d+:|$)/gis;
  let match;
  
  while ((match = primaryQueryPattern.exec(queryText)) !== null) {
    const query = match[1].trim();
    if (query.length > 5) {
      queries.push(query);
      console.log(`[Query Extraction] Found query: "${query}"`);
    }
  }

  // Pattern 2: Look for "Query 1:", "Query 2:", etc.
  if (queries.length === 0) {
    const queryPattern = /(?:^|\n)(?:Query\s+\d+|Search\s+Query\s+\d+|Query\s+#?\d+):\s*(.+?)(?=\n(?:Query\s+\d+|Search\s+Query\s+\d+|$))/gim;
    while ((match = queryPattern.exec(queryText)) !== null) {
      const query = match[2].trim();
      if (query.length > 5 && !query.toLowerCase().includes('query')) {
        queries.push(query);
        console.log(`[Query Extraction] Found query (pattern 2): "${query}"`);
      }
    }
  }

  // Pattern 3: Look for numbered list items (1., 2., etc.) that appear to be queries
  if (queries.length === 0) {
    const lines = queryText.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      // Match patterns like "1. query text" or "1) query text"
      const numberedMatch = trimmed.match(/^\d+[\.\)]\s+(.+)$/);
      if (numberedMatch && numberedMatch[1]) {
        const query = numberedMatch[1].trim();
        // Only add if it looks like a search query (not metadata)
        if (
          query.length > 5 &&
          query.length < 200 &&
          !query.toLowerCase().includes('keywords:') &&
          !query.toLowerCase().includes('skills:') &&
          !query.toLowerCase().includes('title:')
        ) {
          queries.push(query);
          console.log(`[Query Extraction] Found query (numbered list): "${query}"`);
        }
      }
    }
  }

  // Pattern 4: Look for lines that appear to be standalone queries (not part of structured output)
  if (queries.length === 0) {
    const lines = queryText.split('\n');
    let inQuerySection = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Detect start of query section
      if (
        trimmed.toLowerCase().includes('search query') ||
        trimmed.toLowerCase().includes('primary query') ||
        trimmed.toLowerCase().includes('query:') ||
        trimmed.toLowerCase().includes('queries:')
      ) {
        inQuerySection = true;
        // Try to extract query from this line
        const queryMatch = trimmed.match(/[:\-]\s*(.+)/);
        if (queryMatch && queryMatch[1]) {
          const query = queryMatch[1].trim();
          if (query.length > 5) {
            queries.push(query);
            console.log(`[Query Extraction] Found query (after colon): "${query}"`);
          }
        }
        continue;
      }
      
      // Collect queries in query section
      if (inQuerySection && trimmed) {
        // Skip metadata lines
        if (
          trimmed.match(/^[-*•]\s*$/) ||
          trimmed.toLowerCase().includes('keywords:') ||
          trimmed.toLowerCase().includes('skills:') ||
          trimmed.toLowerCase().includes('location:') ||
          trimmed.match(/^[A-Z][A-Za-z\s]+:$/)
        ) {
          inQuerySection = false;
          continue;
        }
        
        // Check if it's a list item or continuation
        if (trimmed.match(/^[-*•]\s+/) || trimmed.match(/^\d+\.\s+/)) {
          const queryMatch = trimmed.match(/^[-*•\d\.]\s+(.+)/);
          if (queryMatch && queryMatch[1]) {
            const query = queryMatch[1].trim();
            if (query.length > 5 && query.length < 200) {
              queries.push(query);
              console.log(`[Query Extraction] Found query (list item): "${query}"`);
            }
          }
        } else if (queries.length > 0 && trimmed.length < 200) {
          // Might be a continuation of the last query
          const lastQuery = queries[queries.length - 1];
          if (lastQuery.length < 100) {
            queries[queries.length - 1] = lastQuery + ' ' + trimmed;
          }
        }
      }
    }
  }

  // Pattern 5: Look for quoted strings that might be queries
  if (queries.length === 0) {
    const quotedMatches = queryText.match(/["']([^"']{10,150})["']/g);
    if (quotedMatches) {
      for (const quoted of quotedMatches) {
        const query = quoted.replace(/["']/g, '').trim();
        if (query.length > 5 && query.length < 200) {
          queries.push(query);
          console.log(`[Query Extraction] Found query (quoted): "${query}"`);
        }
      }
    }
  }

  // Clean up and validate queries
  const cleanedQueries = queries
    .map((q) => {
      // Remove any remaining formatting markers
      return q
        .replace(/^\*\*?/, '')
        .replace(/\*\*?$/, '')
        .replace(/^[-*•]\s*/, '')
        .trim();
    })
    .filter((q) => {
      // Filter out non-query content
      return (
        q.length > 5 &&
        q.length < 500 &&
        !q.toLowerCase().includes('keywords:') &&
        !q.toLowerCase().includes('skills:') &&
        !q.toLowerCase().includes('location:') &&
        !q.toLowerCase().includes('title:') &&
        !q.match(/^[A-Z][a-z\s]+:$/) // Section headers
      );
    })
    .slice(0, 5); // Limit to 5 queries max (will be further limited to 2 for demo)

  console.log(`[Query Extraction] ✅ Extracted ${cleanedQueries.length} queries:`);
  cleanedQueries.forEach((q, i) => {
    console.log(`[Query Extraction]   ${i + 1}. "${q}"`);
  });

  // Fallback: if still no queries, use the full text as a query (but this shouldn't happen)
  if (cleanedQueries.length === 0 && queryText.trim().length > 10) {
    console.log(`[Query Extraction] ⚠️  No queries extracted, using fallback`);
    const fallback = queryText.trim().substring(0, 200);
    cleanedQueries.push(fallback);
  }

  return cleanedQueries;
}
