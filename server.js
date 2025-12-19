import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { X402PaymentHandler } from './lib/x402-server/index.mjs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static files from dist folder (for production)
app.use(express.static('dist'));

// Initialize x402 handler
const x402 = new X402PaymentHandler({
  network: 'solana',
  treasuryAddress: process.env.TREASURY_WALLET_ADDRESS || 'Gnu8xZ8yrhEurUiKokWbKJqe6Djdmo3hUHge8NLbtNeH',
  facilitatorUrl: 'https://facilitator.payai.network',
});

console.log('✅ X402 Payment Handler initialized');
console.log(`💰 Treasury: ${process.env.TREASURY_WALLET_ADDRESS || 'Gnu8xZ8yrhEurUiKokWbKJqe6Djdmo3hUHge8NLbtNeH'}`);

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
    const baseUrl = process.env.BASE_URL || 
                    (req.get('host')?.includes('localhost') 
                      ? `http://localhost:${PORT}` 
                      : `https://${req.get('host')}`);
    
    console.log('🌐 Base URL:', baseUrl);
    
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
    
    if (!verified.isValid) {
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

// Serve frontend for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile('index.html', { root: 'dist' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}\n`);
});
