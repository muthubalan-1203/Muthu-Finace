import { useState, useMemo } from 'react';
import { getItemsForMonth, getAll } from '../utils/storage';
import { formatINR, formatDate, getCurrentMonthYear, getDaysInMonth, getFirstDayOfMonth, isFutureMonth } from '../utils/formatters';
import MonthPicker from '../components/ui/MonthPicker';
import Modal from '../components/ui/Modal';
import { CalendarDays, ChevronLeft, ChevronRight, ArrowDownCircle, ArrowUpCircle, Receipt, Plus, PartyPopper, Edit3, Trash2 } from 'lucide-react';
import { addItem, updateItem, deleteItem, filterByProfile } from '../utils/storage';
import { useApp } from '../contexts/AppContext';

export default function Calendar() {
  const { addToast, refreshKey, triggerRefresh, viewFilter, canEdit } = useApp();
  const { year: curYear, month: curMonth } = getCurrentMonthYear();
  const [year, setYear] = useState(curYear);
  const [month, setMonth] = useState(curMonth);
  const [selectedDay, setSelectedDay] = useState(null);

  const data = useMemo(() => {
    const incomeItems = filterByProfile(getItemsForMonth('income', year, month), viewFilter);
    const expenseItems = filterByProfile(getItemsForMonth('expenses', year, month), viewFilter);
    const bills = filterByProfile(getAll('bills'), viewFilter).filter((b) => {
      const d = new Date(b.dueDate);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    
    // Fetch all events and filter for current month or recurring annual events
    const allEvents = filterByProfile(getAll('events'), viewFilter);
    const eventsForMonth = allEvents.filter((ev) => {
      const d = new Date(ev.date);
      if (ev.isAnnual) {
        return d.getMonth() === month; // Annual events match only by month
      }
      return d.getFullYear() === year && d.getMonth() === month;
    });

    const dayMap = {};
    const initDay = (day) => {
      if (!dayMap[day]) dayMap[day] = { income: [], expenses: [], bills: [], events: [] };
    };

    incomeItems.forEach((i) => {
      const day = new Date(i.date).getDate();
      initDay(day);
      dayMap[day].income.push(i);
    });
    expenseItems.forEach((e) => {
      const day = new Date(e.date).getDate();
      initDay(day);
      dayMap[day].expenses.push(e);
    });
    bills.forEach((b) => {
      const day = new Date(b.dueDate).getDate();
      initDay(day);
      dayMap[day].bills.push(b);
    });
    eventsForMonth.forEach((ev) => {
      const day = new Date(ev.date).getDate();
      initDay(day);
      dayMap[day].events.push(ev);
    });

    return dayMap;
  }, [year, month, refreshKey, viewFilter]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = new Date();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  const [showEventForm, setShowEventForm] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [isAnnual, setIsAnnual] = useState(true);
  const [editingEvent, setEditingEvent] = useState(null);

  const dayDetails = selectedDay ? data[selectedDay] : null;

  function handleEventSubmit(e) {
    e.preventDefault();
    if (!canEdit || !eventTitle.trim() || !selectedDay) return;
    
    // Construct a date string for the selected day in the current viewed year/month
    const d = new Date(year, month, selectedDay);
    // Adjust timezone offset to avoid date shifting
    const dateString = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];

    const eventData = { title: eventTitle.trim(), date: dateString, isAnnual };
    
    if (editingEvent) {
      updateItem('events', editingEvent.id, eventData);
      addToast('Event updated');
    } else {
      addItem('events', eventData);
      addToast('Event created');
    }
    
    setEventTitle('');
    setIsAnnual(true);
    setEditingEvent(null);
    setShowEventForm(false);
    triggerRefresh();
  }

  function startEditEvent(ev) {
    setEditingEvent(ev);
    setEventTitle(ev.title);
    setIsAnnual(!!ev.isAnnual);
    setShowEventForm(true);
  }

  function deleteEvent(id) {
    deleteItem('events', id);
    addToast('Event deleted');
    triggerRefresh();
  }

  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="page-title">Calendar</h1>
          <p className="page-subtitle">Monthly financial calendar</p>
        </div>
        <MonthPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); setSelectedDay(null); }} />
      </div>

      <div className="card">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-ink-300 dark:text-ink-200 py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells before first day */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayData = data[day];
            const isToday = isCurrentMonth && day === today.getDate();
            const hasData = dayData && (dayData.income.length > 0 || dayData.expenses.length > 0 || dayData.bills.length > 0 || dayData.events.length > 0);
            
            // Allow clicking any day to add an event, not just days with data
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 text-sm transition-all relative ${
                  isToday
                    ? 'bg-brand-600 text-white font-bold shadow-sm'
                    : selectedDay === day
                      ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 font-medium'
                      : hasData
                        ? 'hover:bg-cream-200 dark:hover:bg-ink-600 cursor-pointer text-ink dark:text-cream-50'
                        : 'text-ink-300 dark:text-ink-300'
                }`}
              >
                <span className="text-xs sm:text-sm">{day}</span>
                {hasData && (
                  <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center max-w-[24px]">
                    {dayData.events.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                    {dayData.income.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                    {dayData.expenses.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                    {dayData.bills.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-4 pt-3 border-t border-ink-50 dark:border-ink-600">
          <div className="flex items-center gap-1.5 text-xs text-ink-300 dark:text-ink-200">
            <div className="w-2 h-2 rounded-full bg-blue-500" />Events
          </div>
          <div className="flex items-center gap-1.5 text-xs text-ink-300 dark:text-ink-200">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />Income
          </div>
          <div className="flex items-center gap-1.5 text-xs text-ink-300 dark:text-ink-200">
            <div className="w-2 h-2 rounded-full bg-red-500" />Expenses
          </div>
          <div className="flex items-center gap-1.5 text-xs text-ink-300 dark:text-ink-200">
            <div className="w-2 h-2 rounded-full bg-amber-500" />Bills
          </div>
        </div>
      </div>

      {/* Day Detail Modal */}
      <Modal isOpen={!!selectedDay} onClose={() => { setSelectedDay(null); setShowEventForm(false); }} title={`${selectedDay} ${new Date(year, month, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`}>
        <div className="space-y-4">
          {(!dayDetails || (!dayDetails.income.length && !dayDetails.expenses.length && !dayDetails.bills.length && !dayDetails.events.length)) && !showEventForm && (
            <div className="text-center py-6 text-sm text-ink-300">No data for this day.</div>
          )}
          
          {dayDetails?.events.length > 0 && !showEventForm && (
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-blue-500 mb-2">
                <PartyPopper className="w-4 h-4" /> Events & Reminders
              </h3>
              <div className="space-y-1">
                {dayDetails.events.map((ev) => (
                  <div key={ev.id} className="flex justify-between items-center py-1.5 px-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-sm text-ink dark:text-cream-50 font-medium truncate">{ev.title}</span>
                      {ev.isAnnual && <span className="text-[10px] bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">Annual</span>}
                      {viewFilter === 'Family' && <span className="text-[10px] bg-gray-200 dark:bg-ink-600 text-ink-400 dark:text-ink-300 px-1.5 py-0.5 rounded">{ev.addedBy || 'Muthu'}</span>}
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => startEditEvent(ev)} className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded"><Edit3 className="w-3.5 h-3.5 text-blue-500" /></button>
                        <button onClick={() => deleteEvent(ev.id)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!showEventForm && dayDetails?.income.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-emerald-600 mb-2">
                <ArrowDownCircle className="w-4 h-4" /> Income
              </h3>
              <div className="space-y-1">
                {dayDetails.income.map((i) => (
                  <div key={i.id} className="flex justify-between items-center py-1.5 px-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                    <span className="text-sm text-ink dark:text-cream-50 truncate">{i.source}</span>
                    <span className="currency text-sm font-medium text-emerald-600 flex-shrink-0 ml-2">{formatINR(i.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {dayDetails?.expenses.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-red-500 mb-2">
                <ArrowUpCircle className="w-4 h-4" /> Expenses
              </h3>
              <div className="space-y-1">
                {dayDetails.expenses.map((e) => (
                  <div key={e.id} className="flex justify-between items-center py-1.5 px-2 rounded-lg bg-red-50 dark:bg-red-900/20">
                    <span className="text-sm text-ink dark:text-cream-50 truncate">{e.title}</span>
                    <span className="currency text-sm font-medium text-red-500 flex-shrink-0 ml-2">{formatINR(e.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {dayDetails?.bills.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-600 mb-2">
                <Receipt className="w-4 h-4" /> Bills Due
              </h3>
              <div className="space-y-1">
                {dayDetails.bills.map((b) => (
                  <div key={b.id} className="flex justify-between items-center py-1.5 px-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                    <div className="min-w-0 flex-1">
                      <span className="text-sm text-ink dark:text-cream-50 truncate block">{b.name}</span>
                      <span className={`text-xs ${b.paid ? 'text-emerald-500' : 'text-amber-600'}`}>{b.paid ? 'Paid' : 'Pending'}</span>
                    </div>
                    <span className="currency text-sm font-medium text-amber-600 flex-shrink-0 ml-2">{formatINR(b.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!showEventForm && canEdit && (
            <div className="pt-2">
              <button onClick={() => { setEventTitle(''); setIsAnnual(true); setEditingEvent(null); setShowEventForm(true); }} className="btn-primary w-full justify-center">
                <Plus className="w-4 h-4" /> Add Event / Reminder
              </button>
            </div>
          )}

          {showEventForm && (
            <form onSubmit={handleEventSubmit} className="space-y-4 bg-ink-50 dark:bg-ink-800 p-4 rounded-xl">
              <div>
                <label className="text-sm font-medium text-ink dark:text-cream-50 mb-1 block">Event Title</label>
                <input type="text" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} className="input-base" placeholder="e.g. Birthday, Anniversary" autoFocus />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isAnnual" checked={isAnnual} onChange={(e) => setIsAnnual(e.target.checked)} className="rounded border-ink-200 text-brand-600 focus:ring-brand-500" />
                <label htmlFor="isAnnual" className="text-sm text-ink-400 dark:text-ink-200 cursor-pointer">Repeats every year</label>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowEventForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">{editingEvent ? 'Update' : 'Save'}</button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
}
