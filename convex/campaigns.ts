import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const createCampaign = mutation({
  args: {
    name: v.string(),
    jobDescriptionSummary: v.string(),
    perplexityResearch: v.string(),
    keywords: v.string(),
  },
  handler: async (ctx, args) => {
    const campaignId = await ctx.db.insert('campaigns', {
      name: args.name,
      jobDescriptionSummary: args.jobDescriptionSummary,
      perplexityResearch: args.perplexityResearch,
      keywords: args.keywords,
      persuasionAttackStatus: 'not_started', // Default status
      createdAt: Date.now(),
    });
    return campaignId;
  },
});

export const getCampaign = query({
  args: { campaignId: v.id('campaigns') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.campaignId);
  },
});

export const listCampaigns = query({
  handler: async (ctx) => {
    return await ctx.db.query('campaigns').order('desc').collect();
  },
});

export const updatePersuasionAttackStatus = mutation({
  args: {
    campaignId: v.id('campaigns'),
    isPersuasionAttackInProgress: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Legacy support: convert boolean to status string
    await ctx.db.patch(args.campaignId, {
      persuasionAttackStatus: args.isPersuasionAttackInProgress ? 'running' : 'paused',
    });
  },
});

/**
 * Update campaign persuasion attack status
 */
export const updateCampaignStatus = mutation({
  args: {
    campaignId: v.id('campaigns'),
    status: v.string(), // 'not_started', 'running', 'paused'
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.campaignId, {
      persuasionAttackStatus: args.status,
    });
  },
});
