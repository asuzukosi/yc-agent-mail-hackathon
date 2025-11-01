import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { extractTextFromPDF } from '../lib/util';

export const processJobDescriptionTool = createTool({
  id: 'process-job-description-tool',
  description:
    'Processes a job description PDF file and extracts recruitment-relevant information',
  inputSchema: z.object({
    pdfBuffer: z.instanceof(Buffer).describe('PDF file buffer to process'),
  }),
  outputSchema: z.object({
    extractedText: z.string().describe('Raw text extracted from PDF'),
    recruitmentInfo: z.string().describe('AI-extracted recruitment-relevant information'),
    fileSize: z.number().describe('Size of the PDF file in bytes'),
    pagesCount: z.number().describe('Number of pages in the PDF'),
    characterCount: z.number().describe('Number of characters extracted from the PDF'),
  }),
  execute: async ({ context, mastra }) => {
    const { pdfBuffer } = context;

    console.log('📥 Processing job description PDF...');

    try {
      // Step 1: Extract text from PDF
      console.log('📄 Extracting text from PDF...');
      const extractionResult = await extractTextFromPDF(pdfBuffer);

      if (
        !extractionResult.extractedText ||
        extractionResult.extractedText.trim() === ''
      ) {
        throw new Error('No text could be extracted from the PDF');
      }

      console.log(
        `✅ Extracted ${extractionResult.extractedText.length} characters from ${extractionResult.pagesCount} pages`,
      );

      // Step 2: Extract recruitment-relevant information using AI agent
      console.log('🧠 Extracting recruitment-relevant information...');
      const jobDescriptionExtractionAgent = mastra?.getAgent(
        'jobDescriptionExtractionAgent',
      );
      if (!jobDescriptionExtractionAgent) {
        throw new Error('Job description extraction agent not found');
      }

      const extractionResult_text = await jobDescriptionExtractionAgent.generate([
        {
          role: 'user',
          content: `Please extract detailed recruitment-relevant information from this job description:\n\n${extractionResult.extractedText}`,
        },
      ]);

      const recruitmentInfo =
        extractionResult_text.text || 'Information could not be extracted';

      console.log(
        `✅ Extracted recruitment information: ${recruitmentInfo.length} characters`,
      );

      return {
        extractedText: extractionResult.extractedText,
        recruitmentInfo,
        fileSize: pdfBuffer.length,
        pagesCount: extractionResult.pagesCount,
        characterCount: extractionResult.extractedText.length,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Job description processing failed:', errorMessage);
      throw new Error(`Failed to process job description: ${errorMessage}`);
    }
  },
});
