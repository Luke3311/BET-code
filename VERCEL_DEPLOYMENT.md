# Vercel Deployment Guide

This project is configured to deploy on Vercel with serverless API routes.

## Prerequisites

1. Install Vercel CLI:
```bash
npm i -g vercel
```

## Deployment Steps

### 1. Initial Deployment

```bash
vercel
```

Follow the prompts:
- Set up and deploy? **Y**
- Which scope? Select your account
- Link to existing project? **N** (first time)
- What's your project's name? (default is fine)
- In which directory is your code located? **./**
- Want to override settings? **N**

### 2. Set Environment Variables

Go to your Vercel dashboard:
1. Navigate to your project
2. Go to **Settings** → **Environment Variables**
3. Add the following variable:
   - **Name**: `TREASURY_WALLET_ADDRESS`
   - **Value**: `Gnu8xZ8yrhEurUiKokWbKJqe6Djdmo3hUHge8NLbtNeH`
   - **Environment**: Production, Preview, Development (select all)

### 3. Deploy to Production

```bash
vercel --prod
```

## Architecture

- **Frontend**: React + Vite (served by Vercel Edge Network)
- **Backend**: Serverless Function at `/api/payment.js`
- **API Route**: Automatically available at `https://your-domain.vercel.app/api/payment`

## Local Development

For local development, you still need to run both servers:

### Terminal 1 - Frontend
```bash
npm run dev
```

### Terminal 2 - Backend (Express)
```bash
npm run server
```

The frontend will use `http://localhost:3001/api/payment` in development and `/api/payment` in production.

## How It Works

- **Production**: API calls go to `/api/payment` on the same domain (handled by Vercel serverless function)
- **Development**: API calls go to `http://localhost:3001/api/payment` (handled by Express server)

The code automatically detects the environment using `import.meta.env.DEV`.

## Troubleshooting

### "Module not found" errors
Make sure all dependencies are in `package.json`:
```bash
npm install
```

### Payment not working
Check that the environment variable is set correctly in Vercel dashboard.

### CORS errors
The `vercel.json` configuration handles CORS headers automatically.
