import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import BetForm from "../components/betting/BetForm";
import BetCard from "../components/betting/BetCard";

import { Loader2, TrendingUp, AlertCircle } from "lucide-react";

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialStake = location.state?.stakeAmount || '';

  React.useEffect(() => {
    if (!initialStake) {
      navigate('/');
    }
  }, [initialStake, navigate]);

  const { data: wallet, isLoading: isWalletLoading } = useQuery({
    queryKey: ['myWallet'],
    queryFn: async () => {
      const wallets = await base44.entities.Wallet.list();
      return wallets.length > 0 ? wallets[0] : null;
    }
  });

  const { data: activeBets, isLoading: isBetsLoading } = useQuery({
    queryKey: ['myBets'],
    queryFn: async () => {
      const user = await base44.auth.me();
      if (!user) return [];
      return base44.entities.Bet.filter({ status: 'pending', created_by: user.email }, '-created_date', 10);
    },
  });

  if (isWalletLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Column - Betting Form */}
      <div className="lg:col-span-7 space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Place Your Bets</h1>
          <p className="text-zinc-400">
            Write your predictions and stake your $BET tokens.
          </p>
        </div>
        
        <BetForm wallet={wallet} initialStake={initialStake} />

        <div className="bg-gradient-to-br from-zinc-900/50 to-black border border-zinc-800 rounded-2xl p-6 relative overflow-hidden hidden md:block">
          <div className="relative z-10 flex items-start gap-4">
            <div className="p-3 bg-amber-500/10 rounded-xl">
              <TrendingUp className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-100 text-lg">Pro Tip</h3>
              <p className="text-zinc-400 text-sm mt-1 max-w-md">
                Combine multiple selections from the same game into an Accumulator (Acca) to multiply your potential winnings.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Active Slips */}
      <div className="lg:col-span-5 space-y-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-white">Active Slips</h2>
          <span className="text-xs bg-zinc-900 text-zinc-400 px-2 py-1 rounded-full border border-zinc-800">
            {activeBets?.length || 0} Pending
          </span>
        </div>

        <div className="space-y-4">
          {isBetsLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
            </div>
          ) : activeBets?.length > 0 ? (
            activeBets.map((bet) => (
              <BetCard key={bet.id} bet={bet} />
            ))
          ) : (
            <div className="text-center py-16 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/30">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-800 mb-4">
                <AlertCircle className="w-6 h-6 text-zinc-600" />
              </div>
              <h3 className="text-zinc-300 font-medium mb-1">No active bets</h3>
              <p className="text-zinc-500 text-sm">Your pending wagers will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}