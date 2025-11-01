# Seed Dummy Data

This script creates dummy data in the Convex database for demo purposes.

## Usage

To seed the database with dummy data, run:

```bash
npm run seed:data
```

Or directly with Convex:

```bash
npx convex run seedDummyData:seedDummyData
```

## What it creates

The script creates:

1. **One Campaign**: "AI Software Engineer - Perplexity AI"
   - Complete job description for an AI Software Engineer role
   - Relevant keywords for candidate search
   - Perplexity research about the AI engineer market
   - Job description summary with all requirements

2. **Three Candidates**:
   - **Steve Rogers** (asuzukosiie@gmail.com)
     - Title: Senior AI Engineer
     - Company: OpenAI
   - **Hank Pym** (keloasuzu@yahoo.com)
     - Title: Principal ML Engineer
     - Company: Anthropic
   - **Sam Wilson** (kosiasuzu@icloud.com)
     - Title: Staff AI Software Engineer
     - Company: Google AI

All candidates have LinkedIn URLs and email addresses, and are linked to the campaign.

