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

function SidebarNav({ isOpen, onClose }) {
  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm animate-fade-in" 
          onClick={onClose}
        />
      )}
      <aside className={`fixed flex flex-col w-60 h-screen left-0 top-0 bg-white dark:bg-ink-800 border-r border-ink-50 dark:border-ink-700 z-50 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-5 border-b border-ink-50 dark:border-ink-700 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-800 flex items-center justify-center">
              <span className="text-cream-50 font-mono font-bold text-sm">₹</span>
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-lg text-ink dark:text-cream-50 leading-tight">Muthu Finance</span>
              <span className="text-[10px] font-bold text-brand-600 tracking-wider">NEW UPDATE</span>
            </div>
          </div>
          <button className="lg:hidden text-ink-400 dark:text-ink-300 p-1" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-0.5">
          {mainLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-ink-400 dark:text-ink-200 hover:bg-cream-200 dark:hover:bg-ink-700 hover:text-ink dark:hover:text-cream-50'
                }`
              }
            >
              <link.icon className="w-4 h-4" />
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
    <header className="sticky top-0 z-20 bg-white/80 dark:bg-ink-800/80 backdrop-blur-md border-b border-ink-50 dark:border-ink-700 px-4 py-3 flex justify-between items-center">
      <button className="lg:hidden p-1 text-ink-600 dark:text-cream-100" onClick={onMenuClick}>
        <Menu className="w-6 h-6" />
      </button>
      <div className="bg-ink-100 dark:bg-ink-900 p-1 rounded-lg flex items-center gap-1 ml-auto">
        {['Family', 'Muthu', 'Abi'].map((filter) => (
          <button
            key={filter}
            onClick={() => setViewFilter(filter)}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewFilter === filter
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-ink-400 dark:text-ink-300 hover:text-ink dark:hover:text-cream-100'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>
    </header>
  );
}

export default function Layout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-cream dark:bg-ink">
      <SidebarNav isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className="lg:ml-60 min-h-screen flex flex-col">
        <TopBar onMenuClick={() => setIsSidebarOpen(true)} />
        <div className="flex-1 pb-6 lg:pb-0">
          {children}
        </div>
      </main>
    </div>
  );
}
