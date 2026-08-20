import { NavLink } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import {
  LayoutDashboard,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  PiggyBank,
  Receipt,
  Target,
  ClipboardList,
  BarChart3,
  CalendarDays,
  Settings,
  Database,
  TrendingUp,
  Menu,
  X,
  Landmark,
} from 'lucide-react';
import { useState } from 'react';

const mainLinks = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/salary', icon: Wallet, label: 'Salary' },
  { to: '/income', icon: ArrowDownCircle, label: 'Income' },
  { to: '/expenses', icon: ArrowUpCircle, label: 'Expenses' },
  { to: '/budget', icon: TrendingUp, label: 'Budget' },
  { to: '/savings', icon: PiggyBank, label: 'Savings' },
  { to: '/bills', icon: Receipt, label: 'Bills' },
  { to: '/goals', icon: Target, label: 'Goals' },
  { to: '/plans', icon: ClipboardList, label: 'Plans' },
  { to: '/loans', icon: Landmark, label: 'Loans' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
  { to: '/settings', icon: Settings, label: 'Settings' },
  { to: '/backup', icon: Database, label: 'Backup' },
];

// Puthu Bottom Navigation Links (Strictly 4 Buttons)
const bottomNavLinks = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/income', icon: ArrowDownCircle, label: 'Income' },
  { to: '/expenses', icon: ArrowUpCircle, label: 'Expenses' },
  { to: '/savings', icon: PiggyBank, label: 'Savings' },
];

function SidebarNav({ isOpen, onClose }) {
  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm animate-fade-in" 
          onClick={onClose}
        />
      )}
      <aside className={`fixed flex flex-col w-64 h-screen left-0 top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-r border-white/20 dark:border-white/10 z-50 transition-transform duration-300 shadow-[4px_0_24px_rgba(0,0,0,0.1)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.4)] ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-5 border-b border-ink-50/50 dark:border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-800 flex items-center justify-center shadow-lg shadow-brand-500/30">
              <span className="text-white font-mono font-bold text-lg">₹</span>
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-lg text-ink dark:text-white leading-tight">Muthu Finance</span>
              <span className="text-[10px] font-bold text-brand-500 dark:text-brand-400 tracking-wider">PREMIUM 🚀</span>
            </div>
          </div>
          <button className="lg:hidden text-ink-400 dark:text-slate-400 p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-1">
          {mainLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  isActive
                    ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-md shadow-brand-500/20'
                    : 'text-ink-400 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-ink dark:hover:text-white'
                }`
              }
            >
              <link.icon className="w-4.5 h-4.5" />
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}

function TopBar({ onMenuClick }) {
  const { viewFilter, setViewFilter } = useApp();

  return (
    <header className="sticky top-0 z-30 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-white/20 dark:border-white/10 px-4 py-3 flex justify-between items-center shadow-sm">
      <button className="lg:hidden p-2 -ml-2 rounded-lg text-ink-600 dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors" onClick={onMenuClick}>
        <Menu className="w-6 h-6" />
      </button>
      <div className="bg-black/5 dark:bg-white/5 p-1 rounded-xl flex items-center gap-1 ml-auto backdrop-blur-md">
        {['Family', 'Muthu', 'Abi'].map((filter) => (
          <button
            key={filter}
            onClick={() => setViewFilter(filter)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${
              viewFilter === filter
                ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-white shadow-sm'
                : 'text-ink-400 dark:text-slate-400 hover:text-ink dark:hover:text-white'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>
    </header>
  );
}

// PREMIUM BOTTOM NAVIGATION
function BottomNav() {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border-t border-white/20 dark:border-white/10 pb-2">
      <nav className="flex justify-around items-center h-16 px-2">
        {bottomNavLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 ${
                isActive
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-ink-400 dark:text-slate-400 hover:text-ink-500 dark:hover:text-slate-300'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`p-1.5 rounded-xl transition-all duration-300 ${isActive ? 'bg-brand-50 dark:bg-brand-500/20' : ''}`}>
                  <link.icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110 stroke-[2.5px]' : 'stroke-2'}`} />
                </div>
                <span className={`text-[10px] transition-all duration-300 ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {link.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default function Layout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen transition-colors duration-300">
      <SidebarNav isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className="lg:ml-64 min-h-screen flex flex-col relative">
        <TopBar onMenuClick={() => setIsSidebarOpen(true)} />
        {/* pb-24 add pannirukken bottom nav marakkama irukka */}
        <div className="flex-1 pb-24 lg:pb-8">
          {children}
        </div>
        <BottomNav />
      </main>
    </div>
  );
}
