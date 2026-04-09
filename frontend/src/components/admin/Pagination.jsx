import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Pagination component for admin list pages.
 *
 * Props:
 *   pagination  – { total, pages, currentPage, limit }
 *   onPageChange – (page: number) => void
 */
const Pagination = ({ pagination, onPageChange }) => {
  if (!pagination || pagination.pages <= 1) return null;

  const { total, pages, currentPage, limit } = pagination;
  const from = (currentPage - 1) * limit + 1;
  const to   = Math.min(currentPage * limit, total);

  // Build visible page numbers: always show first, last, current ±1, and ellipsis
  const getPages = () => {
    const items = [];
    const delta = 1;
    const range = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(pages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) items.push(1, '…');
    else items.push(1);

    items.push(...range);

    if (currentPage + delta < pages - 1) items.push('…', pages);
    else if (pages > 1) items.push(pages);

    return items;
  };

  return (
    <div className="flex items-center justify-between px-1 py-3 text-sm">
      <p className="text-[var(--text-muted)] text-xs">
        Showing <span className="font-bold text-[var(--text-primary)]">{from}–{to}</span> of{' '}
        <span className="font-bold text-[var(--text-primary)]">{total}</span>
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ChevronLeft size={16} />
        </button>

        {getPages().map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="px-1 text-[var(--text-muted)]">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`min-w-[32px] h-8 rounded-lg text-xs font-bold transition-colors ${
                p === currentPage
                  ? 'bg-green-500 text-white'
                  : 'hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === pages}
          className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
