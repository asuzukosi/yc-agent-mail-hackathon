import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';

/**
 * Create an agent for a specific candidate
 * This is called by the API route /api/campaigns/[id]/start-persuasion-attack for each candidate
 */
export const createAgent = mutation({
  args: {
    campaignId: v.id('campaigns'),
    email: v.string(),
    target: v.id('candidates'),
    inboxId: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const agentId = await ctx.db.insert('agents', {
      campaignId: args.campaignId,
      email: args.email,
      target: args.target,
      inboxId: args.inboxId,
      status: args.status,
      createdAt: Date.now(),
    });
    return agentId;
  },
});

/**
 * Get all agents for a campaign with campaign and target candidate info
 */
export const getAgentsByCampaign = query({
  args: { campaignId: v.id('campaigns') },
  handler: async (ctx, args) => {
    const agents = await ctx.db
      .query('agents')
      .withIndex('by_campaign', (q) => q.eq('campaignId', args.campaignId))
      .collect();
    
    // Get campaign info
    const campaign = await ctx.db.get(args.campaignId);
    
    // Enrich agents with target candidate info
    const enrichedAgents = await Promise.all(
      agents.map(async (agent) => {
        const target = await ctx.db.get(agent.target);
        return {
          ...agent,
          campaign: campaign ? {
            _id: campaign._id,
            name: campaign.name,
            createdAt: campaign.createdAt,
          } : null,
          targetCandidate: target ? {
            _id: target._id,
            name: target.name,
            email: target.email,
            title: target.title,
            company: target.company,
          } : null,
        };
      })
    );
    
    return enrichedAgents;
  },
});

/**
 * Get agent by target candidate
 */
export const getAgentByTarget = query({
  args: { targetId: v.id('candidates') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('agents')
      .withIndex('by_target', (q) => q.eq('target', args.targetId))
      .collect();
  },
});

/**
 * get agent by inbox ID
 */
export const getAgentByInboxId = query({
  args: { inboxId: v.string() },
  handler: async (ctx, args) => {
    const agents = await ctx.db
      .query('agents')
      .filter((q) => q.eq(q.field('inboxId'), args.inboxId))
      .collect();
    
    if (agents.length === 0) {
      return null;
    }

    const agent = agents[0];
    
    // Get campaign and candidate info
    const campaign = await ctx.db.get(agent.campaignId);
    const target = await ctx.db.get(agent.target);
    
    return {
      ...agent,
      campaign: campaign ? {
        _id: campaign._id,
        name: campaign.name,
        jobDescriptionSummary: campaign.jobDescriptionSummary,
        perplexityResearch: campaign.perplexityResearch,
        keywords: campaign.keywords,
        persuasionAttackStatus: campaign.persuasionAttackStatus,
      } : null,
      targetCandidate: target ? {
        _id: target._id,
        name: target.name,
        email: target.email,
        title: target.title,
        company: target.company,
      } : null,
    };
  },
});

/**
 * Update agent status
 */
export const updateAgentStatus = mutation({
  args: {
    agentId: v.id('agents'),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.agentId, {
      status: args.status,
    });
  },
});


