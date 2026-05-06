import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Mail, ChevronDown } from 'lucide-react';

const WHATSAPP_NUMBER = '233574101615';
const QUOTE_EMAIL = 'sales@expertoffice.com.gh';

/**
 * QuoteButton — shows a "Request Quote" dropdown with WhatsApp + Email options.
 *
 * Props:
 *   product  {name, sku, brand, category_name, color, dimensions, variants}
 *   variant  optional currently-selected variant {color_name, dimensions}
 *   size     'sm' | 'md' (default 'md')
 */
const QuoteButton = ({ product, variant, size = 'md' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const buildProductInfo = () => {
    const parts = [`Product: ${product.name}`];
    if (product.sku) parts.push(`SKU: ${product.sku}`);
    if (product.brand) parts.push(`Brand: ${product.brand}`);
    if (product.category_name) parts.push(`Category: ${product.category_name}`);
    if (variant?.color_name) parts.push(`Colour: ${variant.color_name}`);
    else if (product.color) parts.push(`Colour: ${product.color}`);
    if (variant?.dimensions) parts.push(`Dimensions: ${variant.dimensions}`);
    else if (product.dimensions) parts.push(`Dimensions: ${product.dimensions}`);
    return parts.join('\n');
  };

  const handleWhatsApp = () => {
    const info = buildProductInfo();
    const msg = `Hi Expert Office,\n\nI would like to request a quote for the following product:\n\n${info}\n\nPlease let me know the pricing and availability. Thank you!`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
    setOpen(false);
  };

  const handleEmail = () => {
    const info = buildProductInfo();
    const subject = `Quote Request – ${product.name}`;
    const body = `Hi Expert Office Team,\n\nI would like to request a quote for the following product:\n\n${info}\n\nPlease let me know the pricing and availability.\n\nThank you,`;
    window.location.href = `mailto:${QUOTE_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setOpen(false);
  };

  const isSm = size === 'sm';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-2 font-black rounded-2xl transition-all duration-300 active:scale-95 bg-gradient-to-r from-green-500 to-yellow-400 text-gray-900 hover:shadow-[0_0_25px_rgba(34,197,94,0.4)] hover:scale-[1.02] ${
          isSm ? 'px-4 h-9 text-xs' : 'px-6 h-12 text-sm'
        }`}
      >
        <MessageCircle size={isSm ? 14 : 16} />
        Request Quote
        <ChevronDown size={isSm ? 12 : 14} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-56 z-50 rounded-2xl overflow-hidden shadow-2xl border border-[var(--border-color,#e2e8f0)] bg-white dark:bg-gray-900 animate-fadeIn">
          <button
            onClick={handleWhatsApp}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-bold text-left hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors"
          >
            <div className="w-8 h-8 rounded-xl bg-green-500 flex items-center justify-center shrink-0">
              <MessageCircle size={16} className="text-white" />
            </div>
            <div>
              <p className="text-gray-900 dark:text-white font-black text-xs">WhatsApp</p>
              <p className="text-gray-500 dark:text-white/40 text-[10px] font-medium">Quick response</p>
            </div>
          </button>

          <div className="h-px bg-gray-100 dark:bg-white/5" />

          <button
            onClick={handleEmail}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-bold text-left hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
              <Mail size={16} className="text-white" />
            </div>
            <div>
              <p className="text-gray-900 dark:text-white font-black text-xs">Send Email</p>
              <p className="text-gray-500 dark:text-white/40 text-[10px] font-medium">Detailed enquiry</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

export default QuoteButton;
