'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Database, 
  AlertTriangle, 
  MessageSquare, 
  Footprints,
  TrendingUp,
  Cpu
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Inventory Health', path: '/inventory', icon: Database },
    { name: 'Replenishment Alerts', path: '/replenishment', icon: AlertTriangle },
    { name: 'Ask-a-Question', path: '/chat', icon: MessageSquare },
  ];

  return (
    <aside className="w-64 bg-zinc-950 text-zinc-100 flex flex-col h-screen sticky top-0 border-r border-zinc-800">
      {/* Brand Header */}
      <div className="p-6 border-b border-zinc-800 flex items-center gap-3">
        <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-600/30">
          <Footprints size={20} className="animate-pulse" />
        </div>
        <div>
          <h1 className="font-bold text-sm leading-tight text-white tracking-wide">NEEMAN&apos;S</h1>
          <p className="text-[10px] font-semibold text-indigo-400 tracking-wider uppercase">Retail Analytics</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50'
              }`}
            >
              <Icon size={18} className={`transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-100'}`} />
              <span>{item.name}</span>
              {isActive && (
                <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Meta info */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-950/80">
        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-2">
          <div className="flex items-center gap-2 text-zinc-300 text-xs font-semibold">
            <Cpu size={14} className="text-indigo-400" />
            <span>AI Core Engaged</span>
          </div>
          <p className="text-[10px] text-zinc-500 leading-normal">
            Powered by Gemini 1.5 Flash and Prisma SQLite Database.
          </p>
          <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full w-full" />
          </div>
        </div>
      </div>
    </aside>
  );
}
