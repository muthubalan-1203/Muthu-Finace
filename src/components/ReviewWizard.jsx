import { useState, useMemo, useEffect } from 'react';
import { getItemsForMonth, getAll, addItem, getSettings, saveSettings } from '../utils/storage';
import { formatINR } from '../utils/formatters';
import { useApp } from '../contexts/AppContext';
import { Coffee, ChevronRight, CheckCircle2, TrendingDown, TrendingUp, AlertTriangle, X } from 'lucide-react';

export default function ReviewWizard({ onClose }) {
  const { addToast, triggerRefresh } = useApp();
  const [step, setStep] = useState(1);
  const [notes, setNotes] = useState('');

  const today = new Date();
  // We review the PREVIOUS month
  const reviewMonth = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
  const reviewYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
  
  const monthName = new Date(reviewYear, reviewMonth, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  // Data fetching
  const { totalIncome, totalExpenses, topCategories, pendingBills } = useMemo(() => {
    const incomes = getItemsForMonth('income', reviewYear, reviewMonth);
    const expenses = getItemsForMonth('expenses', reviewYear, reviewMonth);
    const bills = getAll('bills').filter(b => !b.paid);

    const tInc = incomes.reduce((s, i) => s + Number(i.amount), 0);
    const tExp = expenses.reduce((s, e) => s + Number(e.amount), 0);

    const catMap = {};
    expenses.forEach(e => {
      catMap[e.category] = (catMap[e.category] || 0) + Number(e.amount);
    });
    
    const topCats = Object.entries(catMap)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);

    return { totalIncome: tInc, totalExpenses: tExp, topCategories: topCats, pendingBills: bills };
  }, [reviewYear, reviewMonth]);

  const net = totalIncome - totalExpenses;

  const handleSave = () => {
    if (notes.trim()) {
      addItem('plans', {
        name: `Monthly Review - ${monthName}`,
        date: today.toISOString().split('T')[0],
        description: notes,
        tags: ['Review', 'Finance']
      });
      addToast('Review notes saved to Plans!');
    }
    
    // Mark as done for this month
    const settings = getSettings();
    const currentMonthStr = `${today.getFullYear()}-${today.getMonth()}`;
    saveSettings({ ...settings, lastReviewDone: currentMonthStr });
    
    triggerRefresh();
    onClose();
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 4));

  return (
    <div className="fixed inset-0 z-[200] bg-brand-900 flex flex-col">
      <button onClick={onClose} className="absolute top-6 right-6 text-white/50 hover:text-white p-2">
        <X className="w-6 h-6" />
      </button>
      
      <div className="flex-1 overflow-y-auto pb-24">
        {step === 1 && (
          <div className="flex flex-col items-center justify-center min-h-full px-6 py-12 animate-fade-in text-center">
            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-6">
              <Coffee className="w-10 h-10 text-brand-200" />
            </div>
            <h1 className="text-3xl font-display font-bold text-white mb-2">Review Time!</h1>
            <p className="text-brand-200 mb-8">Let's look back at {monthName}</p>

            <div className="w-full bg-white/5 rounded-2xl p-6 border border-white/10 mb-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-brand-300 text-sm mb-1">Total Income</p>
                  <p className="text-emerald-400 font-bold text-xl currency">{formatINR(totalIncome)}</p>
                </div>
                <div>
                  <p className="text-brand-300 text-sm mb-1">Total Spent</p>
                  <p className="text-red-400 font-bold text-xl currency">{formatINR(totalExpenses)}</p>
                </div>
              </div>
              
              <div className="pt-4 border-t border-white/10">
                <p className="text-brand-300 text-sm mb-2">Net Savings</p>
                <div className="flex items-center justify-center gap-2">
                  {net >= 0 ? <TrendingUp className="w-6 h-6 text-emerald-400" /> : <TrendingDown className="w-6 h-6 text-red-400" />}
                  <p className={`font-bold text-3xl currency ${net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatINR(Math.abs(net))}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col items-center justify-center min-h-full px-6 py-12 animate-fade-in">
            <h2 className="text-2xl font-display font-bold text-white mb-6">Where did your money go?</h2>
            <div className="w-full space-y-3">
              {topCategories.length > 0 ? topCategories.map((c, i) => (
                <div key={i} className="bg-white/10 p-4 rounded-xl flex justify-between items-center border border-white/5">
                  <span className="text-white font-medium">{c.name}</span>
                  <span className="text-red-300 font-bold currency">{formatINR(c.amount)}</span>
                </div>
              )) : (
                <p className="text-brand-200 text-center">No expenses recorded last month.</p>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col items-center justify-center min-h-full px-6 py-12 animate-fade-in">
            <div className="mb-6 flex flex-col items-center">
              <AlertTriangle className="w-12 h-12 text-amber-400 mb-4" />
              <h2 className="text-2xl font-display font-bold text-white text-center">Pending Bills Check</h2>
            </div>
            
            <div className="w-full space-y-3">
              {pendingBills.length > 0 ? pendingBills.map(b => (
                <div key={b.id} className="bg-white/10 p-4 rounded-xl flex justify-between items-center border border-white/5">
                  <span className="text-white font-medium">{b.name}</span>
                  <span className="text-amber-400 font-bold currency">{formatINR(b.amount)}</span>
                </div>
              )) : (
                <div className="text-center p-6 bg-emerald-500/20 rounded-2xl border border-emerald-500/30">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
                  <p className="text-emerald-200">All caught up! No pending bills.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col items-center justify-center min-h-full px-6 py-12 animate-fade-in">
            <h2 className="text-2xl font-display font-bold text-white mb-2 text-center">Action Plan</h2>
            <p className="text-brand-200 mb-6 text-center text-sm">Write down your goals or decisions for this month. We will save it in your Plans.</p>
            
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full h-48 bg-white/10 border border-white/20 rounded-2xl p-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
              placeholder="e.g. We will spend less on shopping this month. Need to save for the car insurance."
            />
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-brand-900 via-brand-900 to-transparent">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={`w-2 h-2 rounded-full transition-colors ${step >= i ? 'bg-white' : 'bg-white/20'}`} />
            ))}
          </div>
          
          {step < 4 ? (
            <button onClick={nextStep} className="flex items-center gap-2 bg-white text-brand-900 px-6 py-3 rounded-full font-bold hover:bg-brand-50 transition-colors">
              Next <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button onClick={handleSave} className="flex items-center gap-2 bg-emerald-500 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-emerald-600 transition-colors">
              Finish & Save
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
