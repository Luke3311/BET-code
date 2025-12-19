import React from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Clock, CheckCircle2, XCircle, ChevronRight, Layers, Trophy } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function BetCard({ bet }) {
  const statusConfig = {
    pending: { color: "text-zinc-400", bg: "bg-zinc-800/50", border: "border-zinc-700/50", icon: Clock },
    won: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: CheckCircle2 },
    lost: { color: "text-red-900", bg: "bg-red-950/20", border: "border-red-900/20", icon: XCircle },
    void: { color: "text-zinc-600", bg: "bg-zinc-900", border: "border-zinc-800", icon: XCircle },
  };

  const config = statusConfig[bet.status] || statusConfig.pending;
  const StatusIcon = config.icon;

  // Handle old data structure for backward compatibility
  const legs = bet.legs || (bet.game_event ? [{ game_event: bet.game_event, selections: bet.selections }] : []);
  const isMultiGame = legs.length > 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="bg-zinc-900 border-zinc-800 hover:border-amber-500/20 transition-colors group overflow-hidden relative">
        {/* Glow effect for won bets */}
        {bet.status === 'won' && (
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
        )}

        <div className="p-5 space-y-4 relative z-10">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-lg">
                  {isMultiGame ? 'Multi-Game Parlay' : legs[0]?.game_event}
                </h3>
                {isMultiGame && (
                  <Badge variant="secondary" className="bg-amber-500/10 text-amber-300 border-amber-500/20 text-[10px] h-5 px-1.5 border">
                    {legs.length} Games
                  </Badge>
                )}
              </div>
              <p className="text-xs text-zinc-500 font-mono">
                {bet.created_date ? format(new Date(bet.created_date), 'MMM d, HH:mm') : 'Just now'}
              </p>
            </div>
            <Badge variant="outline" className={`${config.bg} ${config.color} ${config.border} capitalize flex gap-1.5 border`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {bet.status}
            </Badge>
          </div>

          <div className="space-y-3">
            {legs.map((leg, i) => (
              <div key={i} className="bg-black/50 rounded-lg p-3 border border-zinc-800/50">
                {isMultiGame && (
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-zinc-800/50">
                    <Trophy className="w-3 h-3 text-amber-500/70" />
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wide">
                      {leg.game_event}
                    </span>
                  </div>
                )}
                
                <div className="space-y-1.5">
                  {leg.selections?.map((sel, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm text-zinc-300">
                      <ChevronRight className="w-4 h-4 text-amber-500/50 mt-0.5 shrink-0" />
                      <span>{sel}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 text-sm">Stake:</span>
              <span className="font-mono font-medium text-white">{bet.stake_amount} $BET</span>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-zinc-500 uppercase">Est. Payout</p>
              <p className="font-mono font-bold text-amber-400">
                {bet.potential_payout?.toLocaleString()} $BET
              </p>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}