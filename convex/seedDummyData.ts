import { mutation, query } from './_generated/server';

/**
 * Seed dummy data for demo purposes
 * Run this with: npx convex run seedDummyData:seedDummyData
 * Or use: npm run seed:data
 */
export const seedDummyData = mutation({
  args: {},
  handler: async (ctx) => {
    console.log('🌱 Starting to seed dummy data...');

    // Create campaign
    const campaignId = await ctx.db.insert('campaigns', {
      name: 'AI Software Engineer - Perplexity AI',
      jobDescriptionSummary: `**Position: AI Software Engineer at Perplexity AI**

**Role Overview:**
We are seeking an exceptional AI Software Engineer to join Perplexity AI's core engineering team. This role involves developing cutting-edge AI systems that power our conversational search platform, integrating large language models, and building scalable infrastructure for real-time AI responses.

**Key Responsibilities:**
- Design and implement AI/ML systems for natural language understanding and generation
- Develop and optimize LLM integration pipelines (GPT-4, Claude, Gemini)
- Build scalable APIs and microservices for AI-powered search capabilities
- Optimize model inference performance and reduce latency
- Collaborate with research teams to productionize state-of-the-art AI models
- Implement retrieval-augmented generation (RAG) systems
- Work with vector databases and embeddings for semantic search
- Build monitoring and evaluation systems for AI model performance

**Required Skills:**
- 3+ years of software engineering experience with focus on AI/ML systems
- Strong proficiency in Python and experience with ML frameworks (PyTorch, TensorFlow, Transformers)
- Experience with LLM APIs (OpenAI, Anthropic, Google AI)
- Knowledge of RAG systems, vector databases (Pinecone, Weaviate, Qdrant)
- Experience with cloud infrastructure (AWS, GCP) and containerization (Docker, Kubernetes)
- Strong understanding of distributed systems and scalable architectures
- Experience with API design and microservices architecture
- Familiarity with MLOps tools and practices

**Preferred Qualifications:**
- Experience with search engines (Elasticsearch, Solr) or information retrieval
- Background in NLP or computational linguistics
- Experience with real-time streaming systems
- Contributions to open-source AI/ML projects
- Advanced degree in Computer Science, AI, or related field

**Company:**
Perplexity AI is a leading AI-powered search company that combines large language models with real-time web information to provide accurate, cited answers. We're backed by top investors and have a team of world-class engineers and researchers.`,
      perplexityResearch: `**Market Research: AI Software Engineer Roles at Search/LLM Companies (2024-2025)**

**Industry Trends:**
The AI Software Engineer role at search-focused LLM companies like Perplexity AI is one of the fastest-growing positions in tech. The market for AI engineers has seen 350% growth since 2020, with particular demand for engineers who can bridge the gap between research and production.

**Current Market Dynamics:**
- **Compensation Range:** $180K - $350K base salary for mid-to-senior roles, with significant equity packages at high-growth AI companies
- **Skills in Highest Demand:** 
  - LLM integration and fine-tuning (GPT-4, Claude, Llama)
  - RAG (Retrieval-Augmented Generation) system development
  - Vector database implementation and optimization
  - Real-time inference optimization
  - API development for AI services

**Technical Skills Trending:**
1. **RAG Systems:** Critical skill for search + LLM companies. Engineers need expertise in:
   - Embedding models (OpenAI embeddings, sentence-transformers)
   - Vector databases (Pinecone, Weaviate, Qdrant, Milvus)
   - Chunking strategies and retrieval optimization
   - Hybrid search combining semantic + keyword search

2. **LLM Integration:** 
   - Multi-model orchestration (routing between GPT-4, Claude, Gemini based on query)
   - Prompt engineering and optimization
   - Streaming response handling
   - Function calling and tool use

3. **Production AI Systems:**
   - Model serving at scale (vLLM, TensorRT-LLM, TGI)
   - Latency optimization (speculative decoding, caching)
   - Cost optimization (model routing, caching)
   - Monitoring AI systems (evaluation, drift detection)

**Industry-Specific Requirements:**
Search-focused AI companies prioritize:
- Experience with information retrieval systems
- Understanding of ranking algorithms and relevance
- Knowledge of web scraping and data ingestion pipelines
- Experience with real-time search infrastructure
- Background in building consumer-facing AI products

**Competitive Landscape:**
Companies competing for similar talent: Google (Search Generative Experience), Microsoft (Bing Chat), Anthropic, OpenAI, Cohere, You.com, Arc Search. Perplexity AI is considered a leader in the "answer engine" category with strong technical credibility.

**Emerging Technologies:**
- **Agentic AI Systems:** Building autonomous agents that can search, reason, and act
- **Multimodal AI:** Integrating vision, audio, and text models
- **Efficient LLMs:** Quantization, pruning, and distillation for faster inference
- **Edge AI:** Running models on-device for privacy and latency

**Recommended Background:**
Ideal candidates typically have:
- Experience at another AI/ML-first company (OpenAI, Anthropic, Cohere, etc.)
- Strong open-source contributions to AI/ML projects
- Publications or research experience in NLP/IR
- Experience scaling AI systems to millions of users`,
      keywords: `Senior AI Engineer LLM RAG, AI Software Engineer Python PyTorch, ML Engineer LLM API integration, Senior Software Engineer AI search, Full Stack AI Engineer RAG vector database, AI Engineer Perplexity OpenAI Claude, Senior ML Engineer production LLM systems, AI Engineer NLP search systems`,
      createdAt: Date.now(),
    });

    console.log(`✅ Created campaign: ${campaignId}`);

    // Create candidates
    const candidates = [
      {
        name: 'Steve Rogers',
        email: 'asuzukosiie@gmail.com',
        linkedinUrl: 'https://www.linkedin.com/in/steve-rogers-ai-engineer',
        title: 'Senior AI Engineer',
        company: 'OpenAI',
      },
      {
        name: 'Hank Pym',
        email: 'keloasuzu@yahoo.com',
        linkedinUrl: 'https://www.linkedin.com/in/hank-pym-ml',
        title: 'Principal ML Engineer',
        company: 'Anthropic',
      },
      {
        name: 'Sam Wilson',
        email: 'kosiasuzu@icloud.com',
        linkedinUrl: 'https://www.linkedin.com/in/sam-wilson-ai',
        title: 'Staff AI Software Engineer',
        company: 'Google AI',
      },
    ];

    const candidateIds = [];
    for (const candidate of candidates) {
      const candidateId = await ctx.db.insert('candidates', {
        campaignId,
        name: candidate.name,
        email: candidate.email,
        linkedinUrl: candidate.linkedinUrl,
        title: candidate.title,
        company: candidate.company,
        createdAt: Date.now(),
      });
      candidateIds.push(candidateId);
      console.log(`✅ Created candidate: ${candidate.name} (${candidateId})`);
    }

    console.log(`🎉 Successfully seeded dummy data!`);
    console.log(`   Campaign: ${campaignId}`);
    console.log(`   Candidates: ${candidateIds.length}`);

    return {
      campaignId,
      candidateIds,
    };
  },
});

/**
 * Seed dummy agents and meetings for existing candidates
 * Run this with: npx convex run seedDummyData:seedDummyMeetings
 * Make sure to run seedDummyData first!
 */
export const seedDummyMeetings = mutation({
  args: {},
  handler: async (ctx) => {
    console.log('🌱 Starting to seed dummy agents and meetings...');

    // First, get all campaigns
    const campaigns = await ctx.db.query('campaigns').collect();
    
    if (campaigns.length === 0) {
      console.log('❌ No campaigns found. Please run seedDummyData first!');
      return {
        success: false,
        message: 'No campaigns found. Please run seedDummyData first!',
      };
    }

    const campaign = campaigns[0];
    console.log(`📋 Using campaign: ${campaign._id}`);

    // Get candidates for this campaign
    const candidates = await ctx.db
      .query('candidates')
      .withIndex('by_campaign', (q) => q.eq('campaignId', campaign._id))
      .collect();

    if (candidates.length < 2) {
      console.log('❌ Not enough candidates found. Please run seedDummyData first!');
      return {
        success: false,
        message: 'Not enough candidates found. Please run seedDummyData first!',
      };
    }

    // Create agents and meetings for the first 2 candidates
    const meetingIds = [];
    
    for (let i = 0; i < Math.min(2, candidates.length); i++) {
      const candidate = candidates[i];
      
      // Create an agent for this candidate
      const agentId = await ctx.db.insert('agents', {
        campaignId: campaign._id,
        email: `agent-${candidate.name.toLowerCase().replace(' ', '-')}@recruitment.ai`,
        target: candidate._id,
        inboxId: `inbox-${candidate._id}`,
        status: 'active',
        createdAt: Date.now(),
      });
      
      console.log(`✅ Created agent: ${agentId} for candidate ${candidate.name}`);

      // Create a meeting for this candidate
      const meetingId = await ctx.db.insert('meetings', {
        campaignId: campaign._id,
        candidateId: candidate._id,
        agentId: agentId,
        status: 'pending',
        scheduledAt: Date.now() + (i * 24 * 60 * 60 * 1000), // Schedule meetings 1 day apart
        createdAt: Date.now(),
      });
      
      meetingIds.push(meetingId);
      console.log(`✅ Created meeting: ${meetingId} for candidate ${candidate.name}`);
    }

    console.log(`🎉 Successfully seeded dummy agents and meetings!`);
    console.log(`   Campaign: ${campaign._id}`);
    console.log(`   Meetings: ${meetingIds.length}`);
    console.log(`\n🔗 Meeting URLs:`);
    meetingIds.forEach((meetingId, idx) => {
      console.log(`   Meeting ${idx + 1}: http://localhost:3000/meetings/${meetingId}`);
    });

    return {
      success: true,
      campaignId: campaign._id,
      meetingIds,
    };
  },
});

/**
 * Get all meetings for a campaign (query helper)
 */
export const getAllMeetings = query({
  args: {},
  handler: async (ctx) => {
    const meetings = await ctx.db.query('meetings').collect();
    
    const enrichedMeetings = await Promise.all(
      meetings.map(async (meeting) => {
        const campaign = await ctx.db.get(meeting.campaignId);
        const candidate = await ctx.db.get(meeting.candidateId);
        const agent = await ctx.db.get(meeting.agentId);
        
        return {
          ...meeting,
          campaign: campaign ? { _id: campaign._id, name: campaign.name } : null,
          candidate: candidate ? { _id: candidate._id, name: candidate.name } : null,
          agent: agent ? { _id: agent._id, email: agent.email } : null,
        };
      })
    );
    
    return enrichedMeetings;
  },
});
