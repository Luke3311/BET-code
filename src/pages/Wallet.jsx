import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { 
  Wallet as WalletIcon, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Copy, 
  QrCode,
  Loader2,
  RefreshCw
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function WalletPage() {
  const queryClient = useQueryClient();
  const [depositAmount, setDepositAmount] = useState('');

  const { data: wallet, isLoading } = useQuery({
    queryKey: ['myWallet'],
    queryFn: async () => {
      const wallets = await base44.entities.Wallet.list();
      if (wallets.length > 0) return wallets[0];
      return await base44.entities.Wallet.create({ balance: 1000, wallet_address: "0x" + Math.random().toString(16).slice(2) });
    }
  });

  const depositMutation = useMutation({
    mutationFn: async (amount) => {
      // Simulation of deposit
      const newBalance = (wallet?.balance || 0) + parseFloat(amount);
      return await base44.entities.Wallet.update(wallet.id, { balance: newBalance });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['myWallet']);
      setDepositAmount('');
      toast.success(`Successfully deposited ${depositAmount} $BET`);
    }
  });

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(wallet?.wallet_address || "");
    toast.success("Address copied to clipboard");
  };

  const handleDeposit = () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return;
    depositMutation.mutate(depositAmount);
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-500" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-white">My Wallet</h1>
        <p className="text-slate-400">Manage your $BET tokens and transactions</p>
      </div>

      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-zinc-900 to-black border-zinc-800 p-8 rounded-3xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-32 bg-amber-500/5 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center justify-center space-y-6">
          <div className="p-4 bg-zinc-800/50 rounded-full ring-1 ring-white/10">
            <WalletIcon className="w-8 h-8 text-amber-400" />
          </div>
          
          <div className="text-center">
            <p className="text-zinc-400 font-medium mb-1">Total Balance</p>
            <h2 className="text-5xl font-mono font-bold text-white tracking-tighter">
              {wallet?.balance?.toLocaleString()} <span className="text-2xl text-amber-500">$BET</span>
            </h2>
          </div>

          <div className="flex gap-4 w-full max-w-sm justify-center">
            <Button className="w-full h-12 bg-amber-600 hover:bg-amber-500 text-black font-bold rounded-xl shadow-lg shadow-amber-900/20">
              Buy $BET
            </Button>
          </div>
        </div>
      </Card>

      {/* Wallet Address */}
      <Card className="bg-zinc-900/50 border-zinc-800 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-zinc-800 rounded-lg">
            <QrCode className="w-5 h-5 text-zinc-400" />
          </div>
          <div>
            <p className="text-sm text-zinc-400">Wallet Address</p>
            <p className="font-mono text-sm md:text-base text-zinc-200 break-all">{wallet?.wallet_address}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleCopyAddress} className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10">
          <Copy className="w-4 h-4 mr-2" /> Copy
        </Button>
      </Card>

      {/* Recent Activity Placeholder */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white">Recent Transactions</h3>
        <div className="space-y-2">
           {/* Placeholder transactions */}
           {[1, 2, 3].map((_, i) => (
             <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 hover:border-zinc-700 transition-colors">
               <div className="flex items-center gap-3">
                 <div className="p-2 rounded-full bg-red-900/10 text-red-500">
                   <ArrowUpCircle className="w-4 h-4" />
                 </div>
                 <div>
                   <p className="font-medium text-zinc-200">Wager Placed</p>
                   <p className="text-xs text-zinc-500">Today, 12:0{i} PM</p>
                 </div>
               </div>
               <span className="font-mono font-medium text-white">
                 -{100 * (i + 1)} $BET
               </span>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}