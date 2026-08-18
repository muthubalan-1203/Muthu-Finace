import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatMonthYear, isFutureMonth, getCurrentMonthYear } from '../../utils/formatters';

export default function MonthPicker({ year, month, onChange, allowFuture = true }) {
  const [y, setY] = useState(year);
  const [m, setM] = useState(month);

  useEffect(() => {
    setY(year);
    setM(month);
  }, [year, month]);

  const goPrev = () => {
    let newM = m - 1;
    let newY = y;
    if (newM < 0) {
      newM = 11;
      newY -= 1;
    }
    setY(newY);
    setM(newM);
    onChange(newY, newM);
  };

  const goNext = () => {
    let newM = m + 1;
    let newY = y;
    if (newM > 11) {
      newM = 0;
      newY += 1;
    }
    if (!allowFuture && isFutureMonth(newY, newM)) return;
    setY(newY);
    setM(newM);
    onChange(newY, newM);
  };

  const { year: curYear, month: curMonth } = getCurrentMonthYear();
  const isNextDisabled = !allowFuture && (y > curYear || (y === curYear && m >= curMonth));

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={goPrev}
        className="p-1.5 rounded-lg hover:bg-cream-300 dark:hover:bg-ink-600 transition-colors"
        aria-label="Previous month"
      >
        <ChevronLeft className="w-4 h-4 text-ink-400 dark:text-ink-200" />
      </button>
      <span className="font-display font-semibold text-sm text-ink dark:text-cream-50 min-w-[120px] text-center">
        {formatMonthYear(y, m)}
      </span>
      <button
        onClick={goNext}
        disabled={isNextDisabled}
        className="p-1.5 rounded-lg hover:bg-cream-300 dark:hover:bg-ink-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Next month"
      >
        <ChevronRight className="w-4 h-4 text-ink-400 dark:text-ink-200" />
      </button>
    </div>
  );
}
