import React from 'react';
import { Buffer } from 'buffer';
import { Link, useLocation } from 'react-router-dom';

if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
}
if (typeof globalThis !== 'undefined') {
  globalThis.Buffer = globalThis.Buffer || Buffer;
}
import { base44 } from "@/api/base44Client";
import { 
  LayoutDashboard, 
  Wallet, 
  History, 
  LogOut, 
  Menu,
  X,
  Zap,
  Crown
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useQuery } from '@tanstack/react-query';
import { Toaster } from "sonner";

export default function Layout({ children }) {
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  // Fetch user wallet balance
  const { data: wallet } = useQuery({
    queryKey: ['myWallet'],
    queryFn: async () => {
      const wallets = await base44.entities.Wallet.list();
      if (wallets.length > 0) return wallets[0];
      // Create default wallet if none exists
      return await base44.entities.Wallet.create({ balance: 1000, wallet_address: "0x" + Math.random().toString(16).slice(2) });
    }
  });

  const menuItems = [];

  const NavContent = () => (
    <div className="flex flex-col h-full bg-black text-white border-r border-zinc-800">
      <div className="p-6 border-b border-zinc-800">
        <h1 className="text-2xl font-bold flex items-center gap-2 tracking-tighter text-white">
          <Crown className="w-6 h-6 text-amber-400" fill="currentColor" />
          $BET
        </h1>
      </div>

      <div className="flex-1 py-6 px-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path}>
              <Button
                variant="ghost"
                className={`w-full justify-start gap-3 h-12 text-base font-medium transition-all duration-200 ${
                  isActive 
                    ? "bg-zinc-900 text-amber-400 border border-amber-500/20 shadow-[0_0_15px_rgba(251,191,36,0.1)]" 
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                }`}
                onClick={() => setIsMobileOpen(false)}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </div>


    </div>
  );

  return (
    <div className="min-h-screen bg-black text-zinc-200 font-sans selection:bg-amber-500/30">
      {/* Mobile Nav */}
      <div className="lg:hidden p-4 border-b border-zinc-800 flex justify-between items-center sticky top-0 z-50 bg-black/80 backdrop-blur-md">
        <div className="flex items-center gap-2 font-bold text-xl text-white">
          <Crown className="w-5 h-5 text-amber-400" fill="currentColor" />
          $BET
        </div>
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-white">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 border-r-zinc-800 w-72 bg-black">
            <NavContent />
          </SheetContent>
        </Sheet>
      </div>

      <Toaster position="top-center" richColors />
      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-72 border-r border-zinc-800 min-h-screen sticky top-0 h-screen overflow-y-auto bg-black">
          <NavContent />
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8 max-w-5xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
