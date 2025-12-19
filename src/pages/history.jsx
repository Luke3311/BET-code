import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import BetCard from "../components/betting/BetCard";
import { Loader2, CalendarRange, ArrowLeft } from "lucide-react";
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";

export default function HistoryPage() {
  const { data: bets, isLoading } = useQuery({
    queryKey: ['allBets'],
    queryFn: () => base44.entities.Bet.list({ sort: { created_date: -1 }, limit: 50 }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/">
            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
            </Button>
        </Link>
        <div className="h-12 w-12 rounded-xl bg-zinc-900 flex items-center justify-center border border-zinc-800">
          <CalendarRange className="w-6 h-6 text-amber-500" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Betting History</h1>
          <p className="text-zinc-400">View your past performance</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      ) : bets?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bets.map((bet) => (
            <BetCard key={bet.id} bet={bet} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-zinc-900/30 rounded-2xl border border-zinc-800">
          <p className="text-zinc-500">No betting history found.</p>
        </div>
      )}
    </div>
  );
}