import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import Hyperspell from 'hyperspell';

/**
 * Tool to search Hyperspell memories for contextual information
 * This tool is used by the campaign assistant agent to retrieve campaign-related information
 */
export const hyperspellTool = createTool({
  id: 'hyperspell-search-tool',
  description:
    'Searches Hyperspell memories for contextual information about campaigns, candidates, email exchanges, research findings, and company details. Use this to retrieve relevant information when answering user questions about campaign status.',
  inputSchema: z.object({
    query: z.string().describe('The search query to find relevant information in Hyperspell memories'),
    sources: z.array(z.string()).optional().describe('Optional array of source types to search (e.g., ["notion", "gmail", "slack"]). If not provided, searches all available sources.'),
    answer: z.boolean().optional().describe('Whether to return an answer (default: true). If true, returns a summarized answer. If false, returns raw search results.'),
  }),
  outputSchema: z.object({
    answer: z.string().describe('The answer or search results from Hyperspell memories'),
    success: z.boolean().describe('Whether the search was successful'),
    error: z.string().optional().describe('Error message if the search failed'),
  }),
  execute: async ({ context, mastra }) => {
    const { query, sources, answer } = context;
    const hyperspellApiKey = process.env.HYPERSPELL_API_KEY;

    if (!hyperspellApiKey) {
      return {
        success: false,
        answer: '',
        error: 'HYPERSPELL_API_KEY environment variable is not set',
      };
    }

    try {
      const userId = 'anonymous'; // No user authentication in this project
      const hyperspell = new Hyperspell({
        apiKey: hyperspellApiKey,
        userID: userId
      });

      const response = await hyperspell.memories.search({
        query,
        answer: answer !== false, // Default to true if not specified
        sources: sources && sources.length > 0 ? sources : undefined, // Use all sources if not specified
      });

      return {
        success: true,
        answer: response.answer || 'No information found for this query.',
      };
    } catch (error) {
      return {
        success: false,
        answer: '',
        error: error instanceof Error ? error.message : 'Unknown error searching Hyperspell memories',
      };
    }
  },
});

