import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const createCandidate = mutation({
  args: {
    campaignId: v.id('campaigns'),
    name: v.string(),
    email: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    title: v.optional(v.string()),
    company: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const candidateId = await ctx.db.insert('candidates', {
      campaignId: args.campaignId,
      name: args.name,
      email: args.email,
      linkedinUrl: args.linkedinUrl,
      title: args.title,
      company: args.company,
      createdAt: Date.now(),
    });
    return candidateId;
  },
});

export const createCandidates = mutation({
  args: {
    campaignId: v.id('campaigns'),
    candidates: v.array(
      v.object({
        name: v.string(),
        email: v.optional(v.string()),
        linkedinUrl: v.optional(v.string()),
        title: v.optional(v.string()),
        company: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const candidateIds = [];
    for (const candidate of args.candidates) {
      const candidateId = await ctx.db.insert('candidates', {
        campaignId: args.campaignId,
        name: candidate.name,
        email: candidate.email,
        linkedinUrl: candidate.linkedinUrl,
        title: candidate.title,
        company: candidate.company,
        createdAt: Date.now(),
      });
      candidateIds.push(candidateId);
    }
    return candidateIds;
  },
});

export const getCandidatesByCampaign = query({
  args: { campaignId: v.id('campaigns') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('candidates')
      .withIndex('by_campaign', (q) => q.eq('campaignId', args.campaignId))
      .collect();
  },
});

export const updateCandidateEmail = mutation({
  args: {
    candidateId: v.id('candidates'),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.candidateId, {
      email: args.email,
    });
  },
});

/**
 * Update candidate status
 */
export const updateCandidateStatus = mutation({
  args: {
    candidateId: v.id('candidates'),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.candidateId, {
      status: args.status,
    });
  },
});
