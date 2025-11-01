# I think I love my job! 😭

A Next.js application that processes job description PDFs through a multi-step pipeline:
1. Mastra-based extraction of recruitment-relevant information
2. Perplexity research for market trends and skills
3. LinkedIn search automation using Browser Use
4. Email enrichment using SixtyFour AI
5. Data storage with Convex

## Setup

1. Install dependencies:
```bash
npm install --legacy-peer-deps
```
or if using pnpm:
```bash
pnpm install --legacy-peer-deps
```

**Note:** 
- This project uses the latest versions of Mastra and AI SDK v5 with streaming support.
- The `--legacy-peer-deps` flag is **required** due to a peer dependency conflict: `browser-use-sdk@2.0.4` requires `zod@^4`, while the project uses `zod@^3.25.76` (required by Mastra and AI SDK v5). This conflict is handled gracefully and does not affect functionality.

If you encounter dependency issues, always use:
```bash
npm install --legacy-peer-deps
```

2. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your actual API keys
```

The pipeline requires the following API keys (in order of usage):

1. **OPENAI_API_KEY** - For Mastra PDF extraction and LinkedIn query generation
2. **PERPLEXITY_API_KEY** - For market research and skill trend analysis
3. **BROWSER_USE_API_KEY** - For LinkedIn search automation
4. **SIXTYFOUR_API_KEY** - For email enrichment of candidates
5. **NEXT_PUBLIC_CONVEX_URL** - For database storage (get from `npx convex dev`)
6. **LIVEKIT_API_KEY** - For voice AI meetings (get from LiveKit Cloud or self-hosted server)
7. **LIVEKIT_API_SECRET** - For voice AI meetings (get from LiveKit Cloud or self-hosted server)
8. **LIVEKIT_URL** - For voice AI meetings (e.g., `wss://your-livekit-server.livekit.cloud`)
9. **ASSEMBLYAI_API_KEY** - For speech-to-text in LiveKit agent (get from [AssemblyAI](https://www.assemblyai.com/))
10. **CARTESIA_API_KEY** - For text-to-speech in LiveKit agent (get from [Cartesia](https://cartesia.ai/))

**Note:** Mastra uses in-memory storage by default (no `MASTRA_DB_URL` needed). All business data (campaigns, candidates) is stored in Convex.

3. Initialize Convex and set environment variables:
```bash
# Start Convex dev server
npx convex dev

# Set AgentMail API key in Convex environment (required for email campaigns)
npx convex env set AGENTMAIL_API_KEY "your-agentmail-api-key-here"

# Optional: Set other environment variables that Convex actions might need
# These will be available to Convex actions, queries, and mutations
```

4. Run the Python LiveKit agent server:
```bash
# Activate your virtual environment (if using one)
source venv/bin/activate  # On macOS/Linux
# or
venv\Scripts\activate  # On Windows

# Install Python dependencies
pip install -r requirements.txt

# Run the agent server
python agent.py dev
```

The Python agent server must be running for the Meetings page to work. The agent processes voice and chat messages from the frontend.

**Important:** The LiveKit agent requires the following API keys in your `.env.local` file:
- `OPENAI_API_KEY` - For the LLM (GPT-4o-mini)
- `ASSEMBLYAI_API_KEY` - For speech-to-text (get from [AssemblyAI](https://www.assemblyai.com/))
- `CARTESIA_API_KEY` - For text-to-speech (get from [Cartesia](https://cartesia.ai/))

If you see a timeout error when starting the agent, check:
1. All API keys are set in `.env.local`
2. You have internet connectivity (models may download on first run)
3. Check the logs for specific error messages about missing keys or failed model loading

5. Run the development server:
```bash
pnpm dev
```

6. (Optional) Set up ngrok for AgentMail webhooks:
   - See [WEBHOOK_SETUP.md](./WEBHOOK_SETUP.md) for detailed instructions
   - This is needed for AgentMail to send webhook callbacks to your local development server

## Environment Variables

- `OPENAI_API_KEY` - OpenAI API key for Mastra (PDF extraction and query generation) and LiveKit agent LLM
- `PERPLEXITY_API_KEY` - Perplexity AI API key (market research)
- `BROWSER_USE_API_KEY` - Browser Use API key (LinkedIn automation)
- `SIXTYFOUR_API_KEY` - SixtyFour AI API key (email enrichment)
- `AGENTMAIL_API_KEY` - AgentMail API key (email sending/receiving)
- `COMPOSIO_API_KEY` - Composio API key for scheduling meetings (get from [Composio Dashboard](https://app.composio.dev))
- `COMPOSIO_ENTITY_ID` - (Optional) Composio entity ID if you want to use a specific authenticated account. If not provided, the first available entity will be used.
- `NEXT_PUBLIC_CONVEX_URL` - Convex deployment URL (database storage)
- `NEXT_PUBLIC_API_URL` - Frontend application root URL (used by LiveKit Python agent to call API endpoints, defaults to `http://localhost:3000`)
- `LIVEKIT_API_KEY` - LiveKit API key for voice AI meetings (get from [LiveKit Cloud](https://cloud.livekit.io))
- `LIVEKIT_API_SECRET` - LiveKit API secret for voice AI meetings
- `LIVEKIT_URL` - LiveKit server URL (e.g., `wss://your-project.livekit.cloud`)
- `ASSEMBLYAI_API_KEY` - AssemblyAI API key for speech-to-text in LiveKit agent (get from [AssemblyAI](https://www.assemblyai.com/))
- `CARTESIA_API_KEY` - Cartesia API key for text-to-speech in LiveKit agent (get from [Cartesia](https://cartesia.ai/))
