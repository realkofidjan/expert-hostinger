import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Eye, Star, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { createProductUrl } from '../utils/url';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5001';

const getColorCode = (name) => {
  const colors = {
    'black': '#1a1a1a', 'white': '#ffffff', 'red': '#ef4444',
    'blue': '#3b82f6', 'green': '#22c55e', 'yellow': '#eab308',
    'purple': '#a855f7', 'orange': '#f97316', 'pink': '#ec4899',
    'grey': '#6b7280', 'gray': '#6b7280', 'silver': '#cbd5e1',
    'gold': '#fbbf24', 'brown': '#78350f', 'navy': '#1e3a8a',
    'charcoal': '#374151', 'matte black': '#111111', 'cream': '#fffdd0',
    'beige': '#f5f5dc'
  };
  const normalized = name?.toLowerCase().trim();
  if (colors[normalized]) return colors[normalized];
  for (const [key, value] of Object.entries(colors)) {
    if (normalized?.includes(key)) return value;
  }
  return '#6b7280';
};

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const img = product.primary_image ? `${BACKEND_URL}${product.primary_image}` : null;
  const productUrl = createProductUrl(product);

  const handleAddToCart = (e) => {
    e.preventDefault();
    if (product.variants?.length > 0) {
      window.location.href = productUrl;
      return;
    }
    addToCart({
      id: product.id,
      name: product.name,
      image: img,
      price: product.price,
    });
  };

  return (
    <div className="group bg-white dark:bg-gray-800 rounded-[2rem] p-3 shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 dark:border-gray-700 overflow-hidden hover:-translate-y-1 flex flex-col">
      {/* Image */}
      <div className="relative overflow-hidden rounded-[1.5rem] mb-6 aspect-[3/4]">
        {img ? (
          <img
            src={img}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-50 to-yellow-50 dark:from-gray-700 dark:to-gray-600">
            <span className="text-4xl">🪑</span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
          <Link
            to={productUrl}
            className="bg-white text-gray-900 border border-white/40 px-6 py-3 rounded-full font-bold transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 hover:bg-green-600 hover:text-white flex items-center gap-2 text-sm shadow-xl"
          >
            <Eye className="w-4 h-4" />
            View Product
          </Link>
        </div>

        {product.is_featured && (
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-gray-900 shadow">
            Featured
          </div>
        )}
        {product.variants?.length > 0 && (
          <div className="absolute top-3 right-3 bg-green-500/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-white shadow">
            {product.variants.length} Colors
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-2 pb-2 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-1.5">
          <Link to={productUrl} className="flex-1">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-tight line-clamp-2 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
              {product.name}
            </h3>
          </Link>
          <div className="flex items-center text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-0.5 rounded-lg flex-shrink-0 ml-2">
            <Star className="w-3 h-3 fill-current" />
            <span className="text-[10px] text-gray-600 dark:text-gray-300 ml-1 font-bold">4.9</span>
          </div>
        </div>

        {product.category_name && (
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-4 font-medium uppercase tracking-wider">{product.category_name}</p>
        )}

        <div className="pt-5 border-t border-gray-100 dark:border-gray-700 mt-auto">
          <div className="flex items-center justify-between gap-4">
            <Link
              to={productUrl}
              className="group/btn flex-1 flex flex-col items-start gap-3"
            >
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-green-600 group-hover/btn:text-green-700 transition-colors">
                {product.variants?.length > 0 
                  ? `Select from ${product.variants.length} colors` 
                  : 'View Details'}
                <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
              </div>
              
              {product.variants?.length > 0 && (
                <div className="flex gap-1.5">
                  {product.variants.slice(0, 6).map((v, i) => (
                    <div 
                      key={i} 
                      className="w-3 h-3 rounded-full border border-gray-100 dark:border-gray-600 shadow-sm"
                      style={{ backgroundColor: v.color_code || getColorCode(v.color_name) }}
                    />
                  ))}
                  {product.variants.length > 6 && (
                    <span className="text-[8px] font-bold text-gray-400">+{product.variants.length - 6}</span>
                  )}
                </div>
              )}
            </Link>

            {product.price > 0 && (
              <div className="text-right">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Price</p>
                <p className="text-sm font-black text-gray-900 dark:text-white">
                  ₵{parseFloat(product.price).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
