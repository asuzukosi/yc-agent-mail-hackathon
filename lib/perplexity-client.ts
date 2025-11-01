import Perplexity from '@perplexity-ai/perplexity_ai';

export interface PerplexityResponse {
  content: string;
  model: string;
}

export async function researchWithPerplexity(
  extractedInfo: string,
): Promise<PerplexityResponse> {
  if (!process.env.PERPLEXITY_API_KEY) {
    throw new Error('PERPLEXITY_API_KEY is not set');
  }

  try {
    const client = new Perplexity({
      apiKey: process.env.PERPLEXITY_API_KEY,
    });

    const completion = await client.chat.completions.create({
      model: 'sonar-pro',
      messages: [
        {
          role: 'user',
          content: `Based on this job description information, provide additional market research and context including:
1. Latest skill trends and requirements for this role
2. Market demand and availability of candidates
3. Salary ranges and compensation trends
4. Top companies hiring for similar roles
5. Key certifications or qualifications that are currently in demand
6. Industry insights and growth areas

Job Description Information:
${extractedInfo}

Provide comprehensive research that would help a recruitment agency understand the market better. Format your response as a well-structured research report.`,
        },
      ],
    });

    const messageContent = completion.choices[0]?.message?.content;
    const content = typeof messageContent === 'string' 
      ? messageContent 
      : Array.isArray(messageContent)
      ? messageContent
          .filter((chunk) => chunk.type === 'text')
          .map((chunk) => (chunk as any).text)
          .join('')
      : '';
    
    return {
      content,
      model: completion.model || 'sonar-pro',
    };
  } catch (error) {
    console.error('Perplexity API error:', error);
    throw new Error(
      `Failed to get research from Perplexity: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}
