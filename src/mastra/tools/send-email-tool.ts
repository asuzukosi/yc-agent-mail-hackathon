import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export interface SendEmailContext {
  agentMailApiKey: string;
}

/**
 * Tool to send an email via AgentMail API
 * This tool is used by the persuasion agent to send introductory emails to candidates
 */
export const sendEmailTool = createTool({
  id: 'send-email-tool',
  description:
    'Sends an email message to a candidate using AgentMail API. Use this to send personalized introductory emails.',
  inputSchema: z.object({
    inboxId: z.string().describe('The AgentMail inbox ID to send the email from'),
    candidateEmail: z.string().email().describe('The email address of the candidate to send to'),
    subject: z.string().describe('The subject line of the email'),
    text: z.string().describe('The plain text content of the email'),
    html: z.string().optional().describe('Optional HTML content of the email'),
  }),
  outputSchema: z.object({
    success: z.boolean().describe('Whether the email was sent successfully'),
    messageId: z.string().optional().describe('The AgentMail message ID if sent successfully'),
    threadId: z.string().optional().describe('The AgentMail thread ID if sent successfully'),
    error: z.string().optional().describe('Error message if sending failed'),
  }),
  execute: async ({ context, mastra }) => {
    const { inboxId, candidateEmail, subject, text, html } = context;
    const { agentMailApiKey } = context as unknown as SendEmailContext;

    if (!agentMailApiKey) {
      throw new Error('AGENTMAIL_API_KEY is required to send emails');
    }

    try {
      const response = await fetch(
        `https://api.agentmail.to/v1/inboxes/${encodeURIComponent(inboxId)}/messages/send`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${agentMailApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: [candidateEmail],
            subject,
            text,
            html,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: `AgentMail API error: ${response.status} ${errorData.message || errorData.error || response.statusText}`,
        };
      }

      const message = await response.json();
      return {
        success: true,
        messageId: message.message_id,
        threadId: message.thread_id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error sending email',
      };
    }
  },
});

