import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

/**
 * Create a new meeting when a candidate accepts
 */
export const createMeeting = mutation({
  args: {
    campaignId: v.id('campaigns'),
    candidateId: v.id('candidates'),
    agentId: v.id('agents'),
    scheduledAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const meetingId = await ctx.db.insert('meetings', {
      campaignId: args.campaignId,
      candidateId: args.candidateId,
      agentId: args.agentId,
      status: 'pending',
      scheduledAt: args.scheduledAt,
      createdAt: Date.now(),
    });
    return meetingId;
  },
});

/**
 * Update meeting status (e.g., to 'completed')
 */
export const updateMeetingStatus = mutation({
  args: {
    meetingId: v.id('meetings'),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const updateData: any = {
      status: args.status,
    };
    
    // If status is 'completed', set completedAt timestamp
    if (args.status === 'completed') {
      updateData.completedAt = Date.now();
    }
    
    await ctx.db.patch(args.meetingId, updateData);
    
    return { success: true };
  },
});

/**
 * Update meeting summary
 */
export const updateMeetingSummary = mutation({
  args: {
    meetingId: v.id('meetings'),
    summary: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.meetingId, {
      summary: args.summary,
    });
    
    return { success: true };
  },
});

/**
 * Get a specific meeting
 */
export const getMeeting = query({
  args: { meetingId: v.id('meetings') },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    
    if (!meeting) {
      return null;
    }
    
    // Enrich with campaign, candidate, and agent info
    const campaign = await ctx.db.get(meeting.campaignId);
    const candidate = await ctx.db.get(meeting.candidateId);
    const agent = await ctx.db.get(meeting.agentId);
    
    return {
      ...meeting,
      campaign: campaign ? {
        _id: campaign._id,
        name: campaign.name,
        jobDescriptionSummary: campaign.jobDescriptionSummary,
        perplexityResearch: campaign.perplexityResearch,
        keywords: campaign.keywords,
      } : null,
      candidate: candidate ? {
        _id: candidate._id,
        name: candidate.name,
        email: candidate.email,
        title: candidate.title,
        company: candidate.company,
      } : null,
      agent: agent ? {
        _id: agent._id,
        email: agent.email,
        status: agent.status,
      } : null,
    };
  },
});

/**
 * Get all meetings for a campaign
 */
export const getMeetingsByCampaign = query({
  args: { campaignId: v.id('campaigns') },
  handler: async (ctx, args) => {
    const meetings = await ctx.db
      .query('meetings')
      .withIndex('by_campaign', (q) => q.eq('campaignId', args.campaignId))
      .collect();
    
    // Enrich with candidate and agent info
    const enrichedMeetings = await Promise.all(
      meetings.map(async (meeting) => {
        const candidate = await ctx.db.get(meeting.candidateId);
        const agent = await ctx.db.get(meeting.agentId);
        
        return {
          ...meeting,
          candidate: candidate ? {
            _id: candidate._id,
            name: candidate.name,
            email: candidate.email,
            title: candidate.title,
            company: candidate.company,
          } : null,
          agent: agent ? {
            _id: agent._id,
            email: agent.email,
            status: agent.status,
          } : null,
        };
      })
    );
    
    return enrichedMeetings;
  },
});

/**
 * Get all meetings for a candidate
 */
export const getMeetingsByCandidate = query({
  args: { candidateId: v.id('candidates') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('meetings')
      .withIndex('by_candidate', (q) => q.eq('candidateId', args.candidateId))
      .collect();
  },
});

/**
 * Get all meetings for an agent
 */
export const getMeetingsByAgent = query({
  args: { agentId: v.id('agents') },
  handler: async (ctx, args) => {
    const meetings = await ctx.db
      .query('meetings')
      .withIndex('by_agent', (q) => q.eq('agentId', args.agentId))
      .collect();
    
    // Enrich with candidate info
    const enrichedMeetings = await Promise.all(
      meetings.map(async (meeting) => {
        const candidate = await ctx.db.get(meeting.candidateId);
        
        return {
          ...meeting,
          candidate: candidate ? {
            _id: candidate._id,
            name: candidate.name,
            email: candidate.email,
            title: candidate.title,
            company: candidate.company,
          } : null,
        };
      })
    );
    
    return enrichedMeetings;
  },
});

