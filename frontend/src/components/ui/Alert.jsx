import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, Bell, ShieldAlert } from 'lucide-react';

/**
 * CustomAlert Component
 * A premium, glass-morphism based alert system for the Expert Office platform.
 * Supports different types: success, error, info, warning.
 */
const CustomAlert = ({ 
  type = 'info', 
  title, 
  message, 
  onClose, 
  duration = 5000,
  show = true 
}) => {
  const [isVisible, setIsVisible] = useState(show);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    setIsVisible(show);
    if (show && duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration]);

  const handleClose = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsAnimatingOut(false);
      if (onClose) onClose();
    }, 400); // Match fadeOut animation duration
  };

  if (!isVisible && !isAnimatingOut) return null;

  const styles = {
    success: {
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
      icon: <CheckCircle className="text-green-500" size={24} />,
      accent: 'bg-green-500',
      shadow: 'shadow-green-500/20'
    },
    error: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      icon: <ShieldAlert className="text-red-500" size={24} />,
      accent: 'bg-red-500',
      shadow: 'shadow-red-500/20'
    },
    warning: {
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
      icon: <AlertCircle className="text-yellow-500" size={24} />,
      accent: 'bg-yellow-500',
      shadow: 'shadow-yellow-500/20'
    },
    info: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      icon: <Info className="text-blue-500" size={24} />,
      accent: 'bg-blue-500',
      shadow: 'shadow-blue-500/20'
    }
  };

  const current = styles[type] || styles.info;

  return (
    <div className={`fixed top-8 right-6 z-[100] w-full max-w-sm pointer-events-none transition-all duration-500 ${isAnimatingOut ? 'opacity-0 translate-x-12' : 'opacity-100 translate-x-0'}`}>
      <div className={`pointer-events-auto glass p-5 rounded-[2rem] border ${current.border} shadow-2xl relative overflow-hidden group animate-fadeIn`}>
        {/* Progress Bar */}
        {duration > 0 && !isAnimatingOut && (
          <div className="absolute bottom-0 left-0 h-1 bg-white/10 w-full overflow-hidden">
             <div 
               className={`h-full ${current.accent}`}
               style={{ 
                 width: '100%',
                 animation: `progressShrink ${duration}ms linear forwards`
               }} 
             />
          </div>
        )}

        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-2xl ${current.bg} flex items-center justify-center flex-shrink-0 border ${current.border} shadow-sm group-hover:rotate-6 transition-transform`}>
            {current.icon}
          </div>
          
          <div className="flex-1 min-w-0">
            {title && <h4 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-wider mb-1">{title}</h4>}
            <p className="text-xs font-bold text-[var(--text-secondary)] leading-relaxed">
              {message}
            </p>
          </div>

          <button 
            onClick={handleClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Decorative elements */}
        <div className={`absolute -top-10 -right-10 w-24 h-24 ${current.accent}/5 blur-3xl rounded-full`} />
      </div>

      <style>{`
        @keyframes progressShrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export default CustomAlert;
