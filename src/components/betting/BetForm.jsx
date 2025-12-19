import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Trophy, Coins, Info, X, Layers, Gamepad2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from '@tanstack/react-query';

const DEVELOPER_EMAIL = "enagz@pm.me";

export default function BetForm({ wallet, initialStake }) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for multiple game groups
  const [groups, setGroups] = useState([
    { id: Date.now(), game: '', selections: [''] }
  ]);
  
  const [amount, setAmount] = useState(initialStake || '');
  const [address, setAddress] = useState(wallet?.wallet_address || '');

  React.useEffect(() => {
    if (wallet?.wallet_address) {
      setAddress(wallet.wallet_address);
    }
  }, [wallet]);

  // Group Handlers
  const handleAddGroup = () => {
    setGroups([...groups, { id: Date.now(), game: '', selections: [''] }]);
  };

  const handleRemoveGroup = (index) => {
    if (groups.length > 1) {
      const newGroups = groups.filter((_, i) => i !== index);
      setGroups(newGroups);
    }
  };

  const handleGameChange = (index, value) => {
    const newGroups = [...groups];
    newGroups[index].game = value;
    setGroups(newGroups);
  };

  // Selection Handlers within a group
  const handleAddSelection = (groupIndex) => {
    const newGroups = [...groups];
    newGroups[groupIndex].selections.push('');
    setGroups(newGroups);
  };

  const handleRemoveSelection = (groupIndex, selectionIndex) => {
    const newGroups = [...groups];
    if (newGroups[groupIndex].selections.length > 1) {
      newGroups[groupIndex].selections = newGroups[groupIndex].selections.filter((_, i) => i !== selectionIndex);
      setGroups(newGroups);
    }
  };

  const handleSelectionChange = (groupIndex, selectionIndex, value) => {
    const newGroups = [...groups];
    newGroups[groupIndex].selections[selectionIndex] = value;
    setGroups(newGroups);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    const isGroupsValid = groups.every(g => 
      g.game.trim() && g.selections.every(s => s.trim())
    );

    if (!isGroupsValid || !amount) {
      toast.error("Please fill in all games and selections");
      return;
    }

    const betAmount = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(betAmount) || betAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (betAmount > 750000) {
      toast.error("Maximum stake amount is 750,000 $BET");
      return;
    }

    if (wallet && wallet.balance < betAmount) {
      toast.error("Insufficient funds in wallet");
      return;
    }

    // Solana address validation (base58, 32-44 chars)
    const solanaRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    if (!address || !solanaRegex.test(address)) {
      toast.error("Please enter a valid Solana wallet address");
      return;
    }

    setIsSubmitting(true);
    try {
      // Update wallet address if changed
      if (wallet && wallet.wallet_address !== address) {
        await base44.entities.Wallet.update(wallet.id, {
          wallet_address: address
        });
      }

      // Prepare legs data
      const legs = groups.map(g => ({
        game_event: g.game,
        selections: g.selections.filter(s => s.trim())
      }));

      let multiplier = 1;
      
      try {
        // Fetch odds for estimation
        const response = await fetch(`https://api.the-odds-api.com/v4/sports/upcoming/odds/?regions=us&markets=h2h&apiKey=e6e6834580b2ae2a3255f48039b4f721`);
        if (response.ok) {
           const events = await response.json();
           
           for (const leg of legs) {
              const gameText = leg.game_event.toLowerCase();
              // Fuzzy match event
              const matchedEvent = events.find(e => 
                 gameText.includes(e.home_team.toLowerCase()) || 
                 gameText.includes(e.away_team.toLowerCase()) ||
                 e.home_team.toLowerCase().includes(gameText) ||
                 e.away_team.toLowerCase().includes(gameText)
              );

              if (matchedEvent && matchedEvent.bookmakers?.length > 0) {
                 const market = matchedEvent.bookmakers[0].markets.find(m => m.key === 'h2h');
                 if (market) {
                    for (const selection of leg.selections) {
                       const selText = selection.toLowerCase();
                       const outcome = market.outcomes.find(o => 
                          selText.includes(o.name.toLowerCase()) || 
                          o.name.toLowerCase().includes(selText)
                       );
                       // Use matched odds or conservative 1.9
                       multiplier *= (outcome ? outcome.price : 1.9);
                    }
                 } else {
                    multiplier *= Math.pow(1.9, leg.selections.length);
                 }
              } else {
                 multiplier *= Math.pow(1.9, leg.selections.length);
              }
           }
        } else {
           throw new Error("API response not OK");
        }
      } catch (err) {
        console.warn("Odds API fetch failed, using fallback:", err);
        const totalSelections = legs.reduce((acc, leg) => acc + leg.selections.length, 0);
        multiplier = Math.pow(1.9, totalSelections);
      }

      // Safety check
      if (multiplier < 1) multiplier = 1;

      await base44.entities.Bet.create({
        legs: legs,
        stake_amount: betAmount,
        status: 'pending',
        potential_payout: betAmount * multiplier
      });

      // Update wallet
      if (wallet) {
        await base44.entities.Wallet.update(wallet.id, {
          balance: wallet.balance - betAmount
        });
      }

      // Send Email
      try {
        const user = await base44.auth.me();
        if (user && user.email) {
          const formattedStake = betAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          const formattedPayout = (betAmount * multiplier).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

          const emailBody = `
      New Wager Placed!

      Stake Amount: ${formattedStake} $BET
      Potential Payout: ${formattedPayout} $BET
      Withdrawal Address: ${address}

      Details:
      ${groups.map((g, i) => `
      Game ${i + 1}: ${g.game}
      Selections: ${g.selections.filter(s => s.trim()).join(', ')}
      `).join('\n')}
          `.trim();

          await base44.integrations.Core.SendEmail({
            to: user.email,
            subject: `Wager Confirmation - ${formattedStake} $BET`,
            body: emailBody
          });

          // Send to Developer
          await base44.integrations.Core.SendEmail({
            to: DEVELOPER_EMAIL,
            subject: `[ADMIN] New Wager - ${formattedStake} $BET`,
            body: `User: ${user.email}\n\n${emailBody}`
          });

          toast.success("Bet placed and confirmation email sent!");
        } else {
          toast.success("Bet placed successfully!");
        }
      } catch (emailError) {
        console.error("Failed to send email:", emailError);
        toast.success("Bet placed successfully! (Email failed)");
      }
      // Reset form
      setGroups([{ id: Date.now(), game: '', selections: [''] }]);
      setAmount('');
      
      queryClient.invalidateQueries(['myBets']);
      queryClient.invalidateQueries(['myWallet']);
    } catch (error) {
      console.error(error);
      toast.error("Failed to place bet");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm p-6 lg:p-8 rounded-2xl shadow-xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Create Wager</h2>
          <p className="text-zinc-400 text-sm">Build your slip manually</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        <div className="space-y-6">
          <AnimatePresence>
            {groups.map((group, groupIndex) => (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="relative bg-black rounded-xl p-4 border border-zinc-800 hover:border-amber-500/30 transition-colors"
              >
                {/* Remove Group Button */}
                {groups.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveGroup(groupIndex)}
                    className="absolute right-2 top-2 h-8 w-8 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 z-10"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}

                {/* Game Input */}
                <div className="space-y-2 mb-4">
                  <Label className="text-amber-400 font-medium text-xs uppercase tracking-wider flex items-center gap-2">
                    <Gamepad2 className="w-3 h-3" />
                    Game {groupIndex + 1}
                  </Label>
                  <Input 
                    value={group.game}
                    onChange={(e) => handleGameChange(groupIndex, e.target.value)}
                    placeholder="e.g. Lakers vs Warriors" 
                    className="bg-zinc-900 border-zinc-800 h-10 focus:ring-amber-500/30 text-white placeholder:text-zinc-600"
                  />
                </div>

                {/* Selections */}
                <div className="space-y-2 pl-4 border-l-2 border-zinc-800">
                  <Label className="text-zinc-500 text-xs font-medium">Selections</Label>
                  {group.selections.map((selection, selIndex) => (
                    <div key={selIndex} className="flex gap-2">
                      <Input 
                        value={selection}
                        onChange={(e) => handleSelectionChange(groupIndex, selIndex, e.target.value)}
                        placeholder="Selection (e.g. Home Win)"
                        className="bg-zinc-900 border-zinc-800 h-9 text-sm focus:ring-amber-500/30 text-white placeholder:text-zinc-600"
                      />
                      {selIndex === 0 ? (
                        <Button
                          type="button"
                          size="icon"
                          onClick={() => handleAddSelection(groupIndex)}
                          className="h-9 w-9 shrink-0 bg-zinc-800 border border-zinc-700 text-amber-400 hover:bg-zinc-700 hover:border-amber-500/50"
                          title="Add another selection for this game"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveSelection(groupIndex, selIndex)}
                          className="h-9 w-9 shrink-0 text-zinc-600 hover:text-red-400"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          <Button
            type="button"
            variant="outline"
            onClick={handleAddGroup}
            className="w-full border-dashed border-zinc-700 text-zinc-400 hover:text-amber-400 hover:border-amber-500/50 hover:bg-amber-500/5 h-12 bg-transparent"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Another Game
          </Button>
        </div>

        {/* Stake Section */}
        <div className="pt-4 border-t border-zinc-800">
          <div className="space-y-2">
            <Label className="text-zinc-300 font-medium">Total Stake ($BET)</Label>
            <div className="relative">
              <div className="absolute left-4 top-3.5 text-amber-400">
                <Coins className="w-5 h-5" />
              </div>
              <Input 
                type="text"
                inputMode="decimal"
                value={amount}
                readOnly={true}
                disabled={true}
                onChange={() => {}}
                placeholder="0.00"
                className="bg-black border-zinc-800 h-12 pl-12 text-lg font-mono text-white focus:ring-amber-500/50 focus:border-amber-500/50 placeholder:text-zinc-600 opacity-50 cursor-not-allowed"
              />
            </div>

            <div className="mt-4">
              <Label className="text-zinc-300 font-medium mb-2 block">Withdrawal Address (Solana)</Label>
              <Input
                placeholder="Enter your Solana wallet address..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="bg-black border-zinc-800 focus:ring-amber-500/30 font-mono text-sm h-10 py-2 text-white"
              />
            </div>

            <p className="text-amber-400 text-sm font-bold mt-4 animate-pulse text-center">
              Good luck! 🍀
            </p>
          </div>

          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full h-14 text-lg font-bold bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black shadow-lg shadow-amber-500/20 rounded-xl mt-6"
          >
            {isSubmitting ? "Processing..." : "Place Wager"}
          </Button>
        </div>
      </form>
    </Card>
  );
}