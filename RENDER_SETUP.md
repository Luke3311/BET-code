# Render Deployment Setup

## Environment Variables Required

In your Render dashboard, go to your web service → **Environment** tab and add these variables:

### Required Variables

1. **BASE_URL**
   - Value: `https://YOUR-APP-NAME.onrender.com` (replace with your actual Render URL)
   - Example: `https://bet-a-wager.onrender.com`
   - **Critical**: Must match your actual deployment URL exactly

2. **TREASURY_WALLET_ADDRESS**
   - Value: `Gnu8xZ8yrhEurUiKokWbKJqe6Djdmo3hUHge8NLbtNeH`
   - Your Solana treasury wallet that receives payments

3. **PORT** (optional)
   - Render sets this automatically, but you can override if needed
   - Default: Uses Render's assigned port

### Why BASE_URL is Critical

The x402 facilitator requires the `resource` field in payment requirements to be **exactly the same** across all payment requests. 

- **Without BASE_URL**: Server auto-detects URL from request headers, which can vary
- **With BASE_URL**: Consistent URL for all payment requests → facilitator accepts them

### Steps to Add Environment Variables

1. Go to https://dashboard.render.com
2. Select your web service
3. Click **Environment** in the left sidebar
4. Click **Add Environment Variable**
5. Add each variable:
   - Key: `BASE_URL`
   - Value: `https://YOUR-APP-NAME.onrender.com`
   - Click **Save Changes**
6. Your service will automatically redeploy with new variables

### Verify Setup

After setting environment variables and redeploying:

1. Check logs for: `🌐 Base URL: https://YOUR-APP-NAME.onrender.com`
2. Test a payment - it should now work!

### Troubleshooting

If you still see the CreateATA error after setting BASE_URL:

1. **Hard refresh your browser** (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
2. Try in **incognito/private window** to bypass browser cache
3. Check Render logs to confirm BASE_URL is being used
4. Verify the URL in BASE_URL exactly matches your Render domain (no trailing slash!)

## Current Deployment URL

Find your Render URL at the top of your service dashboard. It looks like:
```
https://your-app-name.onrender.com
```

or if you have a custom domain:
```
https://yourdomain.com
```

**Use the exact URL** in the BASE_URL environment variable.
