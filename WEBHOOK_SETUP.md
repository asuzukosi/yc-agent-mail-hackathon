# Setting Up ngrok for AgentMail Webhooks

This guide will help you set up ngrok to expose your local development server to the internet so AgentMail can send webhook callbacks.

## Step 1: Install ngrok

### Option A: Using Homebrew (macOS)
```bash
brew install ngrok/ngrok/ngrok
```

### Option B: Using npm (global)
```bash
npm install -g ngrok
```

### Option C: Download directly
1. Visit [ngrok.com/download](https://ngrok.com/download)
2. Download for your OS
3. Extract and add to your PATH

## Step 2: Create ngrok Account (Free)

1. Go to [ngrok.com](https://ngrok.com) and sign up for a free account
2. Get your authtoken from the dashboard: [dashboard.ngrok.com/get-started/your-authtoken](https://dashboard.ngrok.com/get-started/your-authtoken)

## Step 3: Authenticate ngrok

```bash
ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
```

## Step 4: Start Your Next.js Development Server

Make sure your Next.js server is running:

```bash
cd credentials_search
pnpm dev
```

Your server should be running on `http://localhost:3000`

## Step 5: Start ngrok Tunnel

In a **new terminal window**, run:

```bash
ngrok http 3000
```

You'll see output like:
```
Forwarding   https://c1f8c3b12e14.ngrok.app -> http://localhost:3000
```

**Copy the HTTPS URL** (e.g., `https://c1f8c3b12e14.ngrok.app`)

## Step 6: Configure AgentMail Webhook

1. Go to [AgentMail Dashboard](https://dashboard.agentmail.to)
2. Navigate to **Webhooks** or **Settings** → **Webhooks**
3. Add a new webhook with the following details:
   - **Webhook URL**: `https://YOUR-NGROK-URL.ngrok.app/api/webhooks/agentmail`
     - Replace `YOUR-NGROK-URL` with your actual ngrok URL (e.g., `c1f8c3b12e14`)
     - Example: `https://c1f8c3b12e14.ngrok.app/api/webhooks/agentmail`
   - **Events**: Select `message.received`
   - **Method**: `POST`
   - **Status**: `Active`

## Step 7: Test the Webhook

### Option A: Use ngrok's Web Interface
1. Open [http://localhost:4040](http://localhost:4040) in your browser (ngrok web interface)
2. You can see all incoming requests and test webhooks here

### Option B: Send a Test Request
```bash
# Replace YOUR-NGROK-URL with your actual ngrok URL
curl -X POST https://YOUR-NGROK-URL.ngrok.app/api/webhooks/agentmail \
  -H "Content-Type: application/json" \
  -d '{
    "event": "message.received",
    "data": {
      "inbox_id": "test_inbox",
      "thread_id": "test_thread",
      "id": "test_message_id"
    }
  }'

# Example with actual ngrok URL:
curl -X POST https://c1f8c3b12e14.ngrok.app/api/webhooks/agentmail \
  -H "Content-Type: application/json" \
  -d '{
    "event": "message.received",
    "data": {
      "inbox_id": "test_inbox",
      "thread_id": "test_thread",
      "id": "test_message_id"
    }
  }'
```

### Option C: Send a Test Email
1. Send an email to one of your AgentMail inboxes
2. Check your terminal running `pnpm dev` for webhook logs
3. Check the ngrok web interface at [http://localhost:4040](http://localhost:4040) to see the request

## Troubleshooting

### Issue: "ngrok: command not found"
**Solution**: Make sure ngrok is installed and in your PATH

### Issue: Webhook not receiving requests
**Solutions**:
1. Verify ngrok is running: `ps aux | grep ngrok`
2. Verify your Next.js server is running on port 3000
3. Check the webhook URL in AgentMail dashboard matches your ngrok URL
4. Check ngrok web interface at `http://localhost:4040` for incoming requests

### Issue: "Tunnel not found" or ngrok URL changed
**Solution**: 
- Free ngrok URLs change each time you restart ngrok
- Update the webhook URL in AgentMail dashboard with the new URL
- Or use ngrok's static domain feature (paid plan)

### Issue: CORS or SSL errors
**Solution**: 
- Make sure you're using the **HTTPS** URL from ngrok (not HTTP)
- AgentMail requires HTTPS for webhooks

## Important Notes

1. **URL Changes**: Free ngrok URLs change each time you restart ngrok. You'll need to update the webhook URL in AgentMail each time.

2. **Keep ngrok Running**: Keep the ngrok terminal window open while testing. If you close it, the tunnel stops.

3. **Development Only**: This setup is for development only. For production, use a proper domain with HTTPS.

4. **Local Server Must Be Running**: Your Next.js dev server (`pnpm dev`) must be running for webhooks to work.

## Quick Setup Script

Create a file `start-ngrok.sh`:

```bash
#!/bin/bash
# Start Next.js server in background
cd credentials_search
pnpm dev &

# Wait a moment for server to start
sleep 5

# Start ngrok
ngrok http 3000
```

Make it executable and run:
```bash
chmod +x start-ngrok.sh
./start-ngrok.sh
```

## Next Steps

Once set up:
1. Your webhook will receive `message.received` events from AgentMail
2. The handler at `/api/webhooks/agentmail` will process incoming emails
3. Check your terminal logs to see webhook activity
4. Check the ngrok web interface at [http://localhost:4040](http://localhost:4040) for request details

