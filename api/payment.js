import { X402PaymentHandler } from '../lib/x402-server/index.mjs';

const x402 = new X402PaymentHandler({
  network: 'solana',
  treasuryAddress: process.env.TREASURY_WALLET_ADDRESS || 'Gnu8xZ8yrhEurUiKokWbKJqe6Djdmo3hUHge8NLbtNeH',
  facilitatorUrl: 'https://facilitator.payai.network',
});

const paidSessions = new Set();

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Payment-Header, x-payment-header'
  );
  res.setHeader(
    'Access-Control-Expose-Headers',
    'X-Payment-Header, x-payment-header, X-PAYMENT-RESPONSE'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
    
    // Use a consistent URL - VERCEL_URL gives deployment-specific URLs which can cause mismatches
    // In production, use the actual domain; in dev, use localhost
    const baseUrl = process.env.NODE_ENV === 'production' || process.env.VERCEL
      ? 'https://bet-a.vercel.app'
      : (process.env.BASE_URL || 'http://localhost:3000');
    
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
      console.log('❌ No payment header - returning 402 with payment requirements');
      const response = x402.create402Response(paymentRequirements);
      return res.status(response.status).json(response.body);
    }

    console.log('✅ Payment header found - verifying...');
    
    // Decode and log the payment payload for debugging
    try {
      const paymentPayload = JSON.parse(Buffer.from(paymentHeader, 'base64').toString('utf8'));
      console.log('📦 Payment payload:', JSON.stringify(paymentPayload, null, 2));
      console.log('📋 Payment requirements:', JSON.stringify(paymentRequirements, null, 2));
      
      // Log transaction details if present
      if (paymentPayload.payload?.transaction) {
        console.log('🔐 Transaction (base64 encoded) length:', paymentPayload.payload.transaction.length);
        // Try to decode and inspect the transaction
        try {
          const txBuffer = Buffer.from(paymentPayload.payload.transaction, 'base64');
          console.log('📝 Transaction buffer length:', txBuffer.length);
          console.log('📝 Transaction first 20 bytes:', txBuffer.slice(0, 20).toString('hex'));
        } catch (txErr) {
          console.log('⚠️  Could not decode transaction buffer:', txErr.message);
        }
      }
    } catch (e) {
      console.log('⚠️  Could not decode payment header:', e.message);
    }
    
    console.log('🚀 Sending verification request to facilitator...');
    const verified = await x402.verifyPayment(paymentHeader, paymentRequirements);
    console.log('Verification result:', JSON.stringify(verified, null, 2));
    
    if (!verified.isValid) {
      console.log('❌ Payment verification failed:', verified.invalidReason);
      return res.status(402).json({ error: 'Invalid payment', reason: verified.invalidReason });
    }

    console.log('✅ Payment verified successfully!');
    const sessionToken = `paid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    paidSessions.add(sessionToken);

    await x402.settlePayment(paymentHeader, paymentRequirements);

    res.setHeader('X-PAYMENT-RESPONSE', sessionToken);
    res.status(200).json({ success: true, message: 'Payment successful', sessionToken });
    console.log('✅ Payment settled - access granted');
    
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
