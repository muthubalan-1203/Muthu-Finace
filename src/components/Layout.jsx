import { NavLink } from 'react-router-dom';
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
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
  { to: '/settings', icon: Settings, label: 'Settings' },
  { to: '/backup', icon: Database, label: 'Backup' },
];

function SidebarNav() {
  return (
    <aside className="hidden lg:flex flex-col w-60 h-screen fixed left-0 top-0 bg-white dark:bg-ink-800 border-r border-ink-50 dark:border-ink-700 z-30">
      <div className="p-5 border-b border-ink-50 dark:border-ink-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-800 flex items-center justify-center">
            <span className="text-cream-50 font-mono font-bold text-sm">₹</span>
          </div>
          <span className="font-display font-bold text-lg text-ink dark:text-cream-50">Muthu</span>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-0.5">
        {mainLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
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
  );
}

const bottomLinks = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/expenses', icon: ArrowUpCircle, label: 'Expenses' },
  { to: '/savings', icon: PiggyBank, label: 'Savings' },
  { to: '/bills', icon: Receipt, label: 'Bills' },
];

function BottomNav() {
  const [showMore, setShowMore] = useState(false);
  const moreLinks = mainLinks.filter((l) => !bottomLinks.find((b) => b.to === l.to));

  return (
    <>
      {showMore && (
        <div className="fixed inset-0 z-40 lg:hidden animate-fade-in">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowMore(false)} />
          <div className="fixed bottom-16 left-0 right-0 mx-4 mb-2 bg-white dark:bg-ink-700 rounded-2xl shadow-xl animate-slide-up overflow-hidden">
            <div className="p-3 grid grid-cols-3 gap-1">
              {moreLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setShowMore(false)}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-1 px-2 py-3 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-brand-600 text-white'
                        : 'text-ink-400 dark:text-ink-200 hover:bg-cream-200 dark:hover:bg-ink-600'
                    }`
                  }
                >
                  <link.icon className="w-5 h-5" />
                  {link.label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-ink-800/90 backdrop-blur-md border-t border-ink-50 dark:border-ink-700 z-30 lg:hidden">
        <div className="flex items-center justify-around px-2 py-1.5">
          {bottomLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'text-brand-600 dark:text-brand-400'
                    : 'text-ink-300 dark:text-ink-300 hover:text-ink dark:hover:text-cream-50'
                }`
              }
            >
              <link.icon className="w-5 h-5" />
              {link.label}
            </NavLink>
          ))}
          <button
            onClick={() => setShowMore(!showMore)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              showMore
                ? 'text-brand-600 dark:text-brand-400'
                : 'text-ink-300 dark:text-ink-300 hover:text-ink dark:hover:text-cream-50'
            }`}
          >
            {showMore ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            More
          </button>
        </div>
      </nav>
    </>
  );
}

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-cream dark:bg-ink">
      <SidebarNav />
      <BottomNav />
      <main className="lg:ml-60 min-h-screen">{children}</main>
    </div>
  );
}
