import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { X402PaymentHandler } from './lib/x402-server/index.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static files from dist folder (for production)
const distPath = path.join(__dirname, 'dist');
console.log('📁 Serving static files from:', distPath);
app.use(express.static(distPath));

// Initialize x402 handler
const x402 = new X402PaymentHandler({
  network: 'solana',
  treasuryAddress: process.env.TREASURY_WALLET_ADDRESS || 'Gnu8xZ8yrhEurUiKokWbKJqe6Djdmo3hUHge8NLbtNeH',
  facilitatorUrl: 'https://facilitator.payai.network',
});

console.log('✅ X402 Payment Handler initialized');
console.log(`💰 Treasury: ${process.env.TREASURY_WALLET_ADDRESS || 'Gnu8xZ8yrhEurUiKokWbKJqe6Djdmo3hUHge8NLbtNeH'}`);
console.log('🔧 Server version: 2024-12-19-v4');
console.log('🌍 BASE_URL env var:', process.env.BASE_URL || 'NOT SET');

const paidSessions = new Set();

// x402 payment endpoint
app.post('/api/payment', async (req, res) => {
  try {
    const paymentHeader = x402.extractPayment(req.headers);
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    // Convert to token amount (6 decimals)
    const tokenAmount = Math.floor(parseFloat(amount) * 1_000_000).toString();
    
    // Auto-detect base URL: use BASE_URL env var, or construct from request host
    // IMPORTANT: Set BASE_URL in production (e.g., https://your-app.onrender.com)
    let baseUrl;
    if (process.env.BASE_URL) {
      baseUrl = process.env.BASE_URL;
    } else if (req.get('host')?.includes('localhost')) {
      baseUrl = `http://localhost:${PORT}`;
    } else {
      // Production fallback - construct from host
      const protocol = req.get('x-forwarded-proto') || 'https';
      baseUrl = `${protocol}://${req.get('host')}`;
    }
    
    console.log('🌐 Base URL:', baseUrl);
    console.log('📍 Host:', req.get('host'));
    console.log('🔒 Protocol:', req.get('x-forwarded-proto') || 'https');
    
    const paymentRequirements = await x402.createPaymentRequirements({
      price: {
        amount: tokenAmount,
        asset: {
          address: "EHEUCcYsjm6WfCFkLxvZ2ysB3niAsXyQoqsed59jpump"
        }
      },
      network: 'solana',
      config: {
        description: 'Wager Payment',
        resource: `${baseUrl}/api/payment`,
        mimeType: 'application/json',
      }
    });
    
    if (!paymentHeader) {
      const response = x402.create402Response(paymentRequirements);
      return res.status(response.status).json(response.body);
    }

    const verified = await x402.verifyPayment(paymentHeader, paymentRequirements);
    
    console.log('✅ Verification result:', JSON.stringify(verified, null, 2));
    
    if (!verified.isValid) {
      console.error('❌ Payment verification failed:', verified.invalidReason);
      console.error('📦 Payment header (base64):', paymentHeader.substring(0, 100) + '...');
      console.error('📋 Payment requirements:', JSON.stringify(paymentRequirements, null, 2));
      return res.status(402).json({ error: 'Invalid payment', reason: verified.invalidReason });
    }

    const sessionToken = `paid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    paidSessions.add(sessionToken);

    await x402.settlePayment(paymentHeader, paymentRequirements);

    res.set('X-PAYMENT-RESPONSE', sessionToken);
    res.json({ success: true, message: 'Payment successful', sessionToken });
    
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Debug endpoint to check if x402-client.js exists
app.get('/api/debug', async (req, res) => {
  const fs = await import('fs/promises');
  const clientPath = path.join(__dirname, 'dist', 'x402-client.js');
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  
  try {
    const [clientExists, indexExists] = await Promise.all([
      fs.access(clientPath).then(() => true).catch(() => false),
      fs.access(indexPath).then(() => true).catch(() => false)
    ]);
    
    let clientSize = 0;
    if (clientExists) {
      const stats = await fs.stat(clientPath);
      clientSize = stats.size;
    }
    
    res.json({
      distPath: distPath,
      files: {
        'x402-client.js': { exists: clientExists, size: clientSize },
        'index.html': { exists: indexExists }
      },
      env: {
        BASE_URL: process.env.BASE_URL || 'NOT SET',
        NODE_ENV: process.env.NODE_ENV,
        PORT: PORT
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve frontend for all other routes (SPA support) - must be last!
// Use a middleware function instead of app.get('*') for Express 5 compatibility
app.use((req, res, next) => {
  // Only serve index.html for non-API routes that accept HTML
  if (!req.path.startsWith('/api') && req.accepts('html')) {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  } else {
    next();
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}\n`);
});
