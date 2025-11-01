import { BrowserUseClient } from 'browser-use-sdk';

export interface LinkedInSearchResult {
  name: string;
  linkedinUrl: string;
  title?: string;
  company?: string;
  location?: string;
}

/**
 * Initialize Browser Use client
 */
function getBrowserUseClient(): BrowserUseClient {
  if (!process.env.BROWSER_USE_API_KEY) {
    throw new Error('BROWSER_USE_API_KEY is not set');
  }

  return new BrowserUseClient({
    apiKey: process.env.BROWSER_USE_API_KEY,
  });
}

/**
 * Search LinkedIn for candidates using Browser Use SDK
 * Uses a shared session to avoid "too many concurrent sessions" error
 */
export async function searchLinkedInWithBrowserUse(
  searchQuery: string,
  sessionId?: string,
): Promise<LinkedInSearchResult[]> {
  const startTime = Date.now();
  console.log(`[Browser Use] Starting LinkedIn search for query: "${searchQuery}"`);
  
  try {
    const client = getBrowserUseClient();
    let session;

    // Reuse existing session or create new one
    if (sessionId) {
      console.log(`[Browser Use] Reusing existing session: ${sessionId}`);
      try {
        // Try to get the existing session
        session = await client.sessions.getSession(sessionId);
        console.log(`[Browser Use] ✅ Retrieved existing session: ${sessionId}`);
      } catch (error) {
        console.log(`[Browser Use] ⚠️  Could not get session ${sessionId}, creating new one`);
        session = await client.sessions.createSession({
          profileId: undefined,
        });
        console.log(`[Browser Use] ✅ Created new session: ${session.id}`);
      }
    } else {
      console.log(`[Browser Use] Creating new session...`);
      session = await client.sessions.createSession({
        profileId: undefined,
      });
      console.log(`[Browser Use] ✅ Created session: ${session.id}`);
    }

    // Step 2: Create task
    console.log(`[Browser Use] Creating task for query: "${searchQuery}"...`);
    const task = await client.tasks.createTask({
      sessionId: session.id,
      task: `Search LinkedIn for candidates matching this search query: "${searchQuery}". 

For each candidate found, you must extract and return the following information in a JSON format:
{
  "candidates": [
    {
      "name": "Full name of the candidate",
      "linkedinUrl": "Complete LinkedIn profile URL",
      "title": "Current job title (if available)",
      "company": "Current company name (if available)",
      "location": "Location of the candidate (if available)"
    }
  ]
}

Instructions:
1. Go to LinkedIn (linkedin.com)
2. Search for the query: "${searchQuery}"
3. Visit each profile page (up to 20 candidates)
4. Extract the name, LinkedIn URL, title, company, and location
5. Return the results as a JSON object with the structure above

Make sure to:
- Get the full LinkedIn profile URL (e.g., https://www.linkedin.com/in/username/)
- Extract accurate information from the profile page
- Return exactly in the JSON format specified`,
    });

    console.log(`[Browser Use] ✅ Task created: ${task.id}, waiting for completion...`);

    // Step 3: Wait for task to complete and get result
    let result = await task.complete();
    const elapsed = Date.now() - startTime;
    console.log(`[Browser Use] ✅ Task completed in ${elapsed}ms. Status: ${result.status}`);

    // Step 4: Stop the task to ensure output is fully returned
    try {
      console.log(`[Browser Use] Stopping task ${task.id} to finalize output...`);
      await client.tasks.updateTask(task.id, {
        action: 'stop',
      });
      console.log(`[Browser Use] ✅ Task ${task.id} stopped successfully`);
      
      // Get the final task state after stopping
      const finalTask = await client.tasks.getTask(task.id);
      console.log(`[Browser Use] Final task status: ${finalTask.status}`);
      if (finalTask.output && (!result.output || finalTask.output.length > result.output.length)) {
        console.log(`[Browser Use] ✅ Got updated output after stopping (length: ${finalTask.output.length})`);
        // Use the updated output if it's better
        result = { ...result, output: finalTask.output };
      }
    } catch (error) {
      console.log(`[Browser Use] ⚠️  Could not stop task (may already be stopped):`, error);
    }

    if (result.output) {
      console.log(`[Browser Use] Task output length: ${result.output.length} characters`);
      console.log(`[Browser Use] Task output preview: ${result.output.substring(0, 200)}...`);
    } else {
      console.log(`[Browser Use] ⚠️  Task has no output`);
    }

    // Step 5: Parse the output
    if (result.output) {
      try {
        // Try to parse output as JSON
        const parsedOutput = JSON.parse(result.output);
        console.log(`[Browser Use] ✅ Parsed JSON output successfully`);
        const candidates = parseLinkedInResults(parsedOutput);
        console.log(`[Browser Use] ✅ Extracted ${candidates.length} candidates from parsed output`);
        return candidates;
      } catch (parseError) {
        console.log(`[Browser Use] ⚠️  Failed to parse as JSON, trying to extract JSON from text`);
        // If not JSON, try to extract JSON from the text
        const jsonMatch = result.output.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            console.log(`[Browser Use] Found JSON match in text, length: ${jsonMatch[0].length}`);
            const parsedOutput = JSON.parse(jsonMatch[0]);
            console.log(`[Browser Use] ✅ Parsed extracted JSON successfully`);
            const candidates = parseLinkedInResults(parsedOutput);
            console.log(`[Browser Use] ✅ Extracted ${candidates.length} candidates from extracted JSON`);
            return candidates;
          } catch (extractError) {
            console.log(`[Browser Use] ⚠️  Failed to parse extracted JSON:`, extractError);
            // Fallback to text parsing
            const candidates = parseLinkedInResults(result.output);
            console.log(`[Browser Use] ✅ Extracted ${candidates.length} candidates from text parsing`);
            return candidates;
          }
        }
        // Fallback to text parsing
        console.log(`[Browser Use] No JSON match found, trying text parsing`);
        const candidates = parseLinkedInResults(result.output);
        console.log(`[Browser Use] ✅ Extracted ${candidates.length} candidates from text parsing`);
        return candidates;
      }
    }

    console.log(`[Browser Use] ⚠️  No output to parse, returning empty array`);
    return [];
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[Browser Use] ❌ Error after ${elapsed}ms:`, error);
    if (error instanceof Error) {
      console.error(`[Browser Use] Error name: ${error.name}`);
      console.error(`[Browser Use] Error message: ${error.message}`);
      if ('statusCode' in error) {
        console.error(`[Browser Use] Status code: ${(error as any).statusCode}`);
      }
      if ('body' in error) {
        console.error(`[Browser Use] Response body:`, (error as any).body);
      }
    }
    throw new Error(
      `Failed to search LinkedIn with Browser Use: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Parse LinkedIn results from various formats
 */
function parseLinkedInResults(result: any): LinkedInSearchResult[] {
  console.log(`[Browser Use] Parsing results, type: ${typeof result}, isArray: ${Array.isArray(result)}`);
  
  if (!result) {
    console.log(`[Browser Use] ⚠️  Result is null/undefined`);
    return [];
  }

  // If result has candidates array
  if (result.candidates && Array.isArray(result.candidates)) {
    console.log(`[Browser Use] Found candidates array with ${result.candidates.length} items`);
    const candidates: LinkedInSearchResult[] = [];
    for (const item of result.candidates) {
      if (typeof item === 'object' && item !== null) {
        const candidate: LinkedInSearchResult = {
          name: item.name || item.fullName || '',
          linkedinUrl:
            item.linkedinUrl ||
            item.url ||
            item.profileUrl ||
            '',
          title: item.title || item.headline || item.currentTitle,
          company: item.company || item.currentCompany,
          location: item.location || '',
        };
        // Only add if name and URL are present
        if (candidate.name && candidate.linkedinUrl) {
          candidates.push(candidate);
          console.log(`[Browser Use] ✅ Added candidate: ${candidate.name} (${candidate.linkedinUrl})`);
        } else {
          console.log(`[Browser Use] ⚠️  Skipped candidate - missing name or URL:`, candidate);
        }
      }
    }
    return candidates;
  }

  // If result is already an array of candidates
  if (Array.isArray(result)) {
    console.log(`[Browser Use] Result is array with ${result.length} items`);
    const candidates: LinkedInSearchResult[] = [];
    for (const item of result) {
      if (typeof item === 'object' && item !== null) {
        const candidate: LinkedInSearchResult = {
          name: item.name || item.fullName || '',
          linkedinUrl:
            item.linkedinUrl ||
            item.url ||
            item.profileUrl ||
            item.linkedInUrl ||
            '',
          title: item.title || item.headline || item.currentTitle,
          company: item.company || item.currentCompany,
          location: item.location || '',
        };
        // Only add if name and URL are present
        if (candidate.name && candidate.linkedinUrl) {
          candidates.push(candidate);
        }
      }
    }
    return candidates;
  }

  // If result is a string, try to extract JSON or parse as text
  if (typeof result === 'string') {
    console.log(`[Browser Use] Result is string, length: ${result.length}`);
    // Try to find JSON in the string
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      console.log(`[Browser Use] Found JSON match in string`);
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return parseLinkedInResults(parsed);
      } catch {
        console.log(`[Browser Use] ⚠️  Failed to parse JSON from string`);
        return [];
      }
    }
  }

  console.log(`[Browser Use] ⚠️  Could not parse result format`);
  return [];
}

/**
 * Search LinkedIn with multiple queries sequentially using a shared session
 */
export async function searchLinkedInManual(
  searchQueries: string[],
): Promise<LinkedInSearchResult[]> {
  console.log(`[Browser Use] Starting LinkedIn search for ${searchQueries.length} queries sequentially`);
  console.log(`[Browser Use] Queries:`, searchQueries);
  
  const allResults: LinkedInSearchResult[] = [];
  const client = getBrowserUseClient();
  let sessionId: string | undefined = undefined;

  // Create a shared session for all searches
  try {
    console.log(`[Browser Use] Creating shared session for all searches...`);
    const session = await client.sessions.createSession({
      profileId: undefined,
    });
    sessionId = session.id;
    console.log(`[Browser Use] ✅ Created shared session: ${sessionId}`);
  } catch (error) {
    console.error(`[Browser Use] ❌ Failed to create session:`, error);
    throw error;
  }

  try {
    for (let i = 0; i < searchQueries.length; i++) {
      const query = searchQueries[i];
      console.log(`\n[Browser Use] [${i + 1}/${searchQueries.length}] Processing query: "${query}"`);
      
      try {
        const queryStartTime = Date.now();
        const results = await searchLinkedInWithBrowserUse(query, sessionId);
        const queryElapsed = Date.now() - queryStartTime;
        
        console.log(`[Browser Use] [${i + 1}/${searchQueries.length}] ✅ Query completed in ${queryElapsed}ms`);
        console.log(`[Browser Use] [${i + 1}/${searchQueries.length}] Found ${results.length} candidates`);
        
        allResults.push(...results);

        // Add delay between searches to respect rate limits (except for last query)
        if (i < searchQueries.length - 1) {
          const delay = 5000; // 5 second delay between searches
          console.log(`[Browser Use] Waiting ${delay}ms before next search...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      } catch (error) {
        console.error(`[Browser Use] [${i + 1}/${searchQueries.length}] ❌ Failed to search with query "${query}":`, error);
        // Continue with other queries even if one fails
      }
    }
  } finally {
    // Stop the session after all searches are complete
    if (sessionId) {
      try {
        console.log(`[Browser Use] Stopping session ${sessionId}...`);
        await client.sessions.updateSession(sessionId, {
          action: 'stop',
        });
        console.log(`[Browser Use] ✅ Session ${sessionId} stopped successfully`);
      } catch (error) {
        console.error(`[Browser Use] ⚠️  Failed to stop session ${sessionId}:`, error);
        // Don't throw - session will be cleaned up automatically
      }
    }
    console.log(`[Browser Use] ✅ Completed all ${searchQueries.length} searches`);
  }

  // Deduplicate by LinkedIn URL
  console.log(`[Browser Use] Deduplicating results...`);
  const uniqueResults = Array.from(
    new Map(
      allResults.map((item) => [item.linkedinUrl, item]),
    ).values(),
  );

  console.log(`[Browser Use] ✅ Total unique candidates: ${uniqueResults.length} (from ${allResults.length} total)`);
  console.log(`[Browser Use] Candidate names:`, uniqueResults.map(c => c.name).join(', '));

  return uniqueResults;
}
