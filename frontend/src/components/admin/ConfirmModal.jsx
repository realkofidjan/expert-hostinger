import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

/**
 * Reusable confirmation modal.
 *
 * Usage:
 *   const [confirm, setConfirm] = useState({ show: false, message: '', onConfirm: null });
 *
 *   <ConfirmModal
 *     isOpen={confirm.show}
 *     message={confirm.message}
 *     onConfirm={confirm.onConfirm}
 *     onClose={() => setConfirm({ show: false, message: '', onConfirm: null })}
 *   />
 */
const ConfirmModal = ({ isOpen, title, message, confirmLabel = 'Delete', confirmColor = 'red', onConfirm, onClose }) => {
  if (!isOpen) return null;

  const colorMap = {
    red:    { btn: 'bg-red-500 hover:bg-red-600 shadow-red-500/25', icon: 'bg-red-500/10 text-red-500', ring: 'ring-red-500/20' },
    yellow: { btn: 'bg-yellow-500 hover:bg-yellow-600 shadow-yellow-500/25 text-slate-900', icon: 'bg-yellow-500/10 text-yellow-500', ring: 'ring-yellow-500/20' },
    blue:   { btn: 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/25', icon: 'bg-blue-500/10 text-blue-500', ring: 'ring-blue-500/20' },
  };
  const c = colorMap[confirmColor] || colorMap.red;

  const handleConfirm = () => {
    onConfirm?.();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fadeIn"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-scaleIn"
        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-7">
          {/* Icon + Close */}
          <div className="flex items-start justify-between mb-5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${c.icon}`}>
              <AlertTriangle size={22} />
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <X size={18} />
            </button>
          </div>

          {/* Text */}
          <h3 className="text-lg font-black uppercase tracking-tight mb-2" style={{ color: 'var(--text-primary)' }}>
            {title || 'Are you sure?'}
          </h3>
          <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {message || 'This action cannot be undone.'}
          </p>

          {/* Actions */}
          <div className="flex gap-3 mt-7">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-color)'
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all text-white shadow-lg flex items-center justify-center gap-2 ${c.btn}`}
            >
              <Trash2 size={14} />
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
