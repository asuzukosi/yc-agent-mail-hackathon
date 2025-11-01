import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { createInbox, sendMessage } from '@/lib/agentmail-client';
import { mastra } from '@/src/mastra';

const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Start Persuasion Attack API Route
 * 
 * Handles the complex business logic of starting a campaign:
 * 1. Gets candidates and existing agents from Convex
 * 2. Creates AgentMail inboxes for new candidates
 * 3. Creates agent records in Convex database
 * 4. Generates and sends initial persuasion emails to candidates
 * 5. Updates campaign status in Convex
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: campaignId } = await params;

  try {
    // Get all candidates for the campaign
    const candidates = await convexClient.query(api.candidates.getCandidatesByCampaign, {
      campaignId: campaignId as any,
    });

    if (!candidates || candidates.length === 0) {
      return NextResponse.json(
        { error: 'No candidates found for this campaign' },
        { status: 400 }
      );
    }

    // Get campaign details for email generation
    const campaign = await convexClient.query(api.campaigns.getCampaign, {
      campaignId: campaignId as any,
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Get existing agents for this campaign
    const existingAgents = await convexClient.query(api.agents.getAgentsByCampaign, {
      campaignId: campaignId as any,
    });

    // Find candidates that don't have agents yet
    const candidatesWithoutAgents = candidates.filter((candidate) => {
      if (!existingAgents || existingAgents.length === 0) {
        return true; // No agents exist, all candidates need agents
      }
      // Check if this candidate has an agent
      return !existingAgents.some((agent: any) => agent.target === candidate._id);
    });

    if (candidatesWithoutAgents.length === 0) {
      // All candidates already have agents, just update campaign status
      await convexClient.mutation(api.campaigns.updateCampaignStatus, {
        campaignId: campaignId as any,
        status: 'running',
      });
      return NextResponse.json({
        success: true,
        agentsCreated: 0,
        agents: [],
        emailsSent: 0,
      });
    }

    const createdAgents: Array<{
      agentId: string;
      candidateName: string;
      email: string;
      inboxId: string;
    }> = [];
    const emailResults: Array<{
      candidateName: string;
      success: boolean;
      message?: string;
    }> = [];

    // Create an inbox and agent for each candidate that doesn't have one
    let firstError: Error | null = null;

    for (const candidate of candidatesWithoutAgents) {
      try {
        console.log(`Creating agent for candidate: ${candidate.name} (${candidate._id})`);

        // Create a unique inbox using AgentMail API
        console.log('Calling AgentMail createInbox API...');
        const inbox = await createInbox();
        console.log('AgentMail response:', inbox);

        console.log(`Created inbox for candidate ${candidate.name}: ${inbox.email_address}`);

        // Create agent record in the database
        const agentId = await convexClient.mutation(api.agents.createAgent, {
          campaignId: campaignId as any,
          email: inbox.email_address,
          target: candidate._id,
          inboxId: inbox.inbox_id,
          status: 'active',
        });

        console.log(`Created agent record: ${agentId}`);

        createdAgents.push({
          agentId,
          candidateName: candidate.name,
          email: inbox.email_address,
          inboxId: inbox.inbox_id,
        });

        // Generate and send initial email to the candidate
        if (candidate.email) {
          try {
            console.log(`Generating and sending initial email to ${candidate.name} (${candidate.email})`);
            
            // Get the persuasion email agent
            const persuasionAgent = mastra.getAgent('persuasionEmailAgent');
            if (!persuasionAgent) {
              throw new Error('Persuasion email agent not found');
            }

            // Generate personalized email content using the agent
            const emailPrompt = `Write a short, personalized introductory email for ${candidate.name} to convince them to consider this job opportunity.

IMPORTANT REQUIREMENTS:
- Keep the email SHORT (100-150 words max) - do not overwhelm the reader
- Use ${candidate.name}'s name naturally throughout the email
- Reference their current role at ${candidate.company || 'their company'} and title ${candidate.title || ''}
- Be conversational and friendly, not template-like or generic
- Focus on why they're a perfect fit for this specific opportunity

CAMPAIGN: ${campaign.name}
JOB: ${campaign.jobDescriptionSummary}
RESEARCH: ${campaign.perplexityResearch}
KEYWORDS: ${campaign.keywords}

Respond with ONLY valid JSON in this format:
{
  "subject": "Short subject line",
  "text": "Concise email body in plain text"
}`;

            const response = await persuasionAgent.generate([
              {
                role: 'user',
                content: emailPrompt,
              },
            ]);

            // Parse the response to extract email content
            const responseText = response.text || '';
            let emailContent: { subject: string; text: string; html?: string };
            
            // Try to extract JSON from the response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                emailContent = JSON.parse(jsonMatch[0]);
              } catch (parseError) {
                // Fallback: create a basic email structure
                emailContent = {
                  subject: `${candidate.name}, perfect fit for exclusive ${campaign.name} opportunity?`,
                  text: responseText,
                };
              }
            } else {
              // Fallback if no JSON found
              emailContent = {
                subject: `${candidate.name}, perfect fit for exclusive ${campaign.name} opportunity?`,
                text: responseText,
              };
            }

            // Send the email using AgentMail
            console.log('Sending email via AgentMail...');
            const sentMessage = await sendMessage(inbox.inbox_id, {
              to: candidate.email,
              subject: emailContent.subject,
              text: emailContent.text,
              html: emailContent.html,
            });

            console.log(`Email sent successfully. Message ID: ${sentMessage.message_id}`);

            emailResults.push({
              candidateName: candidate.name,
              success: true,
              message: 'Email sent successfully',
            });
          } catch (emailError) {
            console.error(`Failed to send email to ${candidate.name}:`, emailError);
            emailResults.push({
              candidateName: candidate.name,
              success: false,
              message: emailError instanceof Error ? emailError.message : 'Unknown error',
            });
          }
        } else {
          console.log(`No email address for candidate ${candidate.name}, skipping email send`);
          emailResults.push({
            candidateName: candidate.name,
            success: false,
            message: 'No email address available',
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Failed to create agent for candidate ${candidate._id} (${candidate.name}):`, errorMessage);
        if (!firstError) {
          firstError = error instanceof Error ? error : new Error(String(error));
        }
      }
    }

    // If we have errors and no agents were created, return error
    if (createdAgents.length === 0 && candidatesWithoutAgents.length > 0 && firstError) {
      return NextResponse.json(
        { error: `Failed to create any agents: ${firstError.message}` },
        { status: 500 }
      );
    }

    // Update campaign status to 'running'
    await convexClient.mutation(api.campaigns.updateCampaignStatus, {
      campaignId: campaignId as any,
      status: 'running',
    });

    const successfulEmails = emailResults.filter(r => r.success).length;

    return NextResponse.json({
      success: true,
      agentsCreated: createdAgents.length,
      agents: createdAgents,
      emailsSent: successfulEmails,
      emailResults: emailResults,
    });
  } catch (error) {
    console.error('Error starting persuasion attack:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start persuasion attack' },
      { status: 500 }
    );
  }
}

