export interface SixtyFourLead {
  name: string;
  company?: string;
  title?: string;
  phone?: string;
  linkedin?: string;
}

export interface SixtyFourEmailResult {
  email: [string, string, string]; // [email, status, type]
}

export interface SixtyFourFindEmailResponse {
  name: string;
  company?: string;
  title?: string;
  phone?: string;
  linkedin?: string;
  email: SixtyFourEmailResult['email'][];
}

export async function findEmailWithSixtyFour(
  lead: SixtyFourLead,
): Promise<SixtyFourFindEmailResponse | null> {
  const startTime = Date.now();
  console.log(`[SixtyFour] Starting email lookup for: ${lead.name}`);
  console.log(`[SixtyFour] Lead data:`, { 
    name: lead.name, 
    company: lead.company, 
    title: lead.title, 
    linkedin: lead.linkedin?.substring(0, 50) + '...' 
  });

  if (!process.env.SIXTYFOUR_API_KEY) {
    console.error(`[SixtyFour] ❌ SIXTYFOUR_API_KEY is not set`);
    throw new Error('SIXTYFOUR_API_KEY is not set');
  }

  try {
    console.log(`[SixtyFour] Making API request to find-email endpoint...`);
    const response = await fetch('https://api.sixtyfour.ai/find-email', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.SIXTYFOUR_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lead,
        bruteforce: true,
        only_company_emails: false,
      }),
    });

    const elapsed = Date.now() - startTime;
    console.log(`[SixtyFour] Response received in ${elapsed}ms. Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[SixtyFour] ❌ API error:`, {
        status: response.status,
        statusText: response.statusText,
        errorData,
      });
      throw new Error(
        `SixtyFour API error: ${response.status} ${errorData.message || response.statusText}`,
      );
    }

    const data = await response.json();
    console.log(`[SixtyFour] ✅ Response data received`);
    console.log(`[SixtyFour] Response structure:`, {
      hasEmail: !!data.email,
      emailArrayLength: data.email?.length || 0,
      emailData: data.email ? JSON.stringify(data.email).substring(0, 200) : 'none',
    });

    if (data.email && data.email.length > 0) {
      console.log(`[SixtyFour] ✅ Found ${data.email.length} email(s) for ${lead.name}`);
    } else {
      console.log(`[SixtyFour] ⚠️  No emails found for ${lead.name}`);
    }

    return data;
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[SixtyFour] ❌ Error after ${elapsed}ms:`, error);
    if (error instanceof Error) {
      console.error(`[SixtyFour] Error name: ${error.name}`);
      console.error(`[SixtyFour] Error message: ${error.message}`);
      console.error(`[SixtyFour] Error stack:`, error.stack?.substring(0, 500));
    }
    throw new Error(
      `Failed to find email with SixtyFour: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

export async function findEmailsForCandidates(
  candidates: Array<{
    name: string;
    linkedinUrl?: string;
    company?: string;
    title?: string;
  }>,
  onProgress?: (
    progress: number,
    total: number,
    candidateName: string,
    emailFound: boolean,
  ) => void,
): Promise<
  Array<{
    name: string;
    email?: string;
    linkedinUrl?: string;
    company?: string;
    title?: string;
  }>
> {
  const startTime = Date.now();
  console.log(`\n[SixtyFour] ========================================`);
  console.log(`[SixtyFour] Starting email enrichment for ${candidates.length} candidates`);
  console.log(`[SixtyFour] ========================================\n`);

  if (candidates.length === 0) {
    console.log(`[SixtyFour] ⚠️  No candidates to enrich, returning empty array`);
    return [];
  }

  const enrichedCandidates = [];
  let successCount = 0;
  let failureCount = 0;
  let noEmailCount = 0;

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const candidateStartTime = Date.now();
    
    console.log(`\n[SixtyFour] [${i + 1}/${candidates.length}] Processing: ${candidate.name}`);
    console.log(`[SixtyFour] [${i + 1}/${candidates.length}] LinkedIn: ${candidate.linkedinUrl || 'N/A'}`);
    console.log(`[SixtyFour] [${i + 1}/${candidates.length}] Company: ${candidate.company || 'N/A'}`);
    console.log(`[SixtyFour] [${i + 1}/${candidates.length}] Title: ${candidate.title || 'N/A'}`);

    try {
      if (!candidate.linkedinUrl) {
        console.log(`[SixtyFour] [${i + 1}/${candidates.length}] ⚠️  Skipping - no LinkedIn URL`);
        enrichedCandidates.push(candidate);
        noEmailCount++;
        onProgress?.(i + 1, candidates.length, candidate.name, false);
        continue;
      }

      const result = await findEmailWithSixtyFour({
        name: candidate.name,
        linkedin: candidate.linkedinUrl,
        company: candidate.company,
        title: candidate.title,
      });

      const candidateElapsed = Date.now() - candidateStartTime;
      
      if (result && result.email && result.email.length > 0) {
        console.log(`[SixtyFour] [${i + 1}/${candidates.length}] Email data structure:`, {
          isArray: Array.isArray(result.email),
          length: result.email.length,
          firstItem: result.email[0],
          firstItemType: typeof result.email[0],
          firstItemIsArray: Array.isArray(result.email[0]),
        });

        // Extract email from the tuple format: [email, status, type]
        const emailData = result.email[0];
        console.log(`[SixtyFour] [${i + 1}/${candidates.length}] First email data:`, emailData);

        if (emailData && Array.isArray(emailData) && emailData[0]) {
          const email = emailData[0];
          console.log(`[SixtyFour] [${i + 1}/${candidates.length}] ✅ Extracted email: ${email}`);
          enrichedCandidates.push({
            ...candidate,
            email: email,
          });
          successCount++;
          console.log(`[SixtyFour] [${i + 1}/${candidates.length}] ✅ Completed in ${candidateElapsed}ms`);
          onProgress?.(i + 1, candidates.length, candidate.name, true);
        } else {
          console.log(`[SixtyFour] [${i + 1}/${candidates.length}] ⚠️  Email data format unexpected, adding candidate without email`);
          enrichedCandidates.push(candidate);
          noEmailCount++;
          console.log(`[SixtyFour] [${i + 1}/${candidates.length}] ⚠️  Completed in ${candidateElapsed}ms (no email)`);
          onProgress?.(i + 1, candidates.length, candidate.name, false);
        }
      } else {
        console.log(`[SixtyFour] [${i + 1}/${candidates.length}] ⚠️  No email found in result`);
        enrichedCandidates.push(candidate);
        noEmailCount++;
        console.log(`[SixtyFour] [${i + 1}/${candidates.length}] ⚠️  Completed in ${candidateElapsed}ms (no email)`);
        onProgress?.(i + 1, candidates.length, candidate.name, false);
      }

      // Add a small delay to respect rate limits (1000 requests per minute = ~60ms between requests)
      // Using 100ms to be safe
      if (i < candidates.length - 1) {
        console.log(`[SixtyFour] [${i + 1}/${candidates.length}] Waiting 100ms before next request...`);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (error) {
      const candidateElapsed = Date.now() - candidateStartTime;
      failureCount++;
      console.error(`[SixtyFour] [${i + 1}/${candidates.length}] ❌ Error after ${candidateElapsed}ms:`, error);
      if (error instanceof Error) {
        console.error(`[SixtyFour] [${i + 1}/${candidates.length}] Error details:`, {
          name: error.name,
          message: error.message,
        });
      }
      // Continue with candidate even if email lookup fails
      enrichedCandidates.push(candidate);
      console.log(`[SixtyFour] [${i + 1}/${candidates.length}] ⚠️  Added candidate without email due to error`);
      onProgress?.(i + 1, candidates.length, candidate.name, false);
    }
  }

  const totalElapsed = Date.now() - startTime;
  console.log(`\n[SixtyFour] ========================================`);
  console.log(`[SixtyFour] Email enrichment completed in ${totalElapsed}ms`);
  console.log(`[SixtyFour] Results: ${successCount} with email, ${noEmailCount} without email, ${failureCount} errors`);
  console.log(`[SixtyFour] Total enriched: ${enrichedCandidates.length}`);
  console.log(`[SixtyFour] ========================================\n`);

  return enrichedCandidates;
}
