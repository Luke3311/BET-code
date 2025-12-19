import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowRight, Coins, Wallet } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function Home() {
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [phantomWallet, setPhantomWallet] = useState(null);
  const [x402Client, setX402Client] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Connect Phantom Wallet
  const connectPhantomWallet = async () => {
    try {
      toast.info('Connecting to Phantom...');
      
      const provider = window?.phantom?.solana;
      if (!provider?.isPhantom) {
        toast.error('Phantom wallet not installed!');
        window.open('https://phantom.app', '_blank');
        return;
      }

      const resp = await provider.connect();
      
      const walletObj = {
        publicKey: resp.publicKey,
        signTransaction: async (transaction) => {
          return await provider.signTransaction(transaction);
        },
        signAndSendTransaction: async (transaction) => {
          return await provider.signAndSendTransaction(transaction);
        }
      };

      setPhantomWallet(walletObj);

      const client = window.X402Solana.createX402Client({
        wallet: walletObj,
        network: 'mainnet-beta',
        rpcUrl: 'https://mainnet.helius-rpc.com/?api-key=ca236ed7-a31f-41b6-84b8-70bd9872de12',
        maxPaymentAmount: BigInt(1_000_000_000_000_000),
      });

      setX402Client(client);
      toast.success(`Wallet connected: ${resp.publicKey.toString().slice(0, 8)}...`);
    } catch (error) {
      console.error('Connection error:', error);
      toast.error('Failed to connect wallet: ' + error.message);
    }
  };

  const handleAmountChange = (e) => {
    // Remove commas to get raw number
    let value = e.target.value.replace(/,/g, '');
    
    // Allow empty or digits only
    if (value === '' || /^\d*$/.test(value)) {
      // Enforce max limit of 750,000
      if (value !== '' && parseFloat(value) > 750000) {
        toast.error("Maximum stake is 750,000 $BET");
        value = "750000";
      }
      
      // Format with commas
      const formatted = value === '' ? '' : Number(value).toLocaleString();
      setAmount(formatted);
    }
  };

  const handleStake = async (e) => {
    e.preventDefault();
    
    const rawAmount = parseFloat(amount.replace(/,/g, ''));
    
    if (!rawAmount || rawAmount <= 0) {
      toast.error("Please enter a valid stake amount");
      return;
    }

    if (!phantomWallet || !x402Client) {
      toast.error("Please connect your Phantom wallet first");
      return;
    }

    setIsProcessing(true);
    
    try {
      console.log('🔄 Starting payment flow...');
      console.log('Wallet:', phantomWallet.publicKey.toString());
      console.log('Amount:', rawAmount);
      
      toast.info('🔄 Processing payment... Approve in Phantom');

      // For Vercel deployment, API routes are at /api/* on the same domain
      // In development, we still need to use localhost:3001
      const paymentEndpoint = import.meta.env.DEV 
        ? 'http://localhost:3001/api/payment'
        : '/api/payment';
      
      console.log('Payment endpoint:', paymentEndpoint);

      const response = await x402Client.fetch(paymentEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount: rawAmount })
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      // x402Client.fetch handles the 402 flow automatically
      // If we get here, payment was successful (or user cancelled)
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Payment successful!', result);
        toast.success('✅ Payment successful!');
        navigate(createPageUrl('Dashboard'), { state: { stakeAmount: amount } });
      } else if (response.status === 402) {
        // This shouldn't happen as x402Client handles 402, but just in case
        console.log('❌ Got 402 response - payment flow did not complete');
        toast.error('Payment was not completed');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Payment failed:', response.status, errorData);
        throw new Error(`Payment failed: ${response.status}`);
      }
      
    } catch (error) {
      console.error('Payment error:', error);
      // Check if user cancelled the payment
      if (error.message?.includes('cancelled') || error.message?.includes('rejected')) {
        toast.error('Payment was cancelled');
      } else {
        toast.error('Payment failed: ' + error.message);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="bg-zinc-900 border-zinc-800 p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[80px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative z-10 space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-white">Enter Stake</h1>
              <p className="text-zinc-400">Set your wager amount to begin</p>
            </div>

            <form onSubmit={handleStake} className="space-y-6">
              {/* Phantom Wallet Connection */}
              {!phantomWallet ? (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Wallet className="w-5 h-5 text-amber-400" />
                      <div>
                        <p className="text-white font-medium">Connect Phantom Wallet</p>
                        <p className="text-zinc-400 text-xs">Required for payment</p>
                      </div>
                    </div>
                    <Button 
                      type="button"
                      onClick={connectPhantomWallet}
                      className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
                    >
                      Connect
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Wallet className="w-5 h-5 text-green-400" />
                    <div>
                      <p className="text-white font-medium">Wallet Connected</p>
                      <p className="text-zinc-400 text-xs font-mono">{phantomWallet.address.slice(0, 8)}...{phantomWallet.address.slice(-8)}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-zinc-300">Stake Amount ($BET)</Label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-amber-500">
                    <Coins className="w-5 h-5" />
                  </span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="0"
                    className="pl-12 bg-black border-zinc-800 h-14 text-2xl font-mono text-white focus:ring-amber-500/30 placeholder:text-zinc-700"
                  />
                </div>
                <p className="text-xs text-zinc-500 text-right">Max: 750,000 $BET</p>
              </div>

              <Button 
                type="submit" 
                disabled={isProcessing || !phantomWallet}
                className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-black font-bold text-base shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Processing...' : 'Stake and proceed to selections'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
