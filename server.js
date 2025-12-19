import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { X402PaymentHandler } from './lib/x402-server/index.mjs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Enhanced CORS configuration
app.use(cors({
  origin: '*',
  credentials: true,
  exposedHeaders: ['X-Payment-Header', 'x-payment-header', 'X-PAYMENT-RESPONSE']
}));
app.use(express.json());

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
    console.log('📥 Payment request received');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    
    const paymentHeader = x402.extractPayment(req.headers);
    console.log('💳 Payment header extracted:', paymentHeader ? 'Yes' : 'No');
    
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    // Convert to token amount (6 decimals)
    const tokenAmount = Math.floor(parseFloat(amount) * 1_000_000).toString();
    
    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
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
      console.log('❌ No payment header - returning 402 with payment requirements');
      const response = x402.create402Response(paymentRequirements);
      return res.status(response.status).json(response.body);
    }

    console.log('✅ Payment header found - verifying...');
    const verified = await x402.verifyPayment(paymentHeader, paymentRequirements);
    console.log('Verification result:', verified);
    
    if (!verified.isValid) {
      console.log('❌ Payment verification failed:', verified.invalidReason);
      return res.status(402).json({ error: 'Invalid payment', reason: verified.invalidReason });
    }

    console.log('✅ Payment verified successfully!');
    const sessionToken = `paid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    paidSessions.add(sessionToken);

    await x402.settlePayment(paymentHeader, paymentRequirements);

    res.set('X-PAYMENT-RESPONSE', sessionToken);
    res.json({ success: true, message: 'Payment successful', sessionToken });
    console.log('✅ Payment settled - access granted');
    
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}\n`);
});
