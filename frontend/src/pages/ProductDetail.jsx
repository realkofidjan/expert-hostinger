import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, ShoppingBag, Tag, ChevronLeft, ChevronRight, CheckCircle,
  Truck, ShieldCheck, Headphones, Star, Minus, Plus, Share2, Heart,
  Info, LayoutGrid, FileText, MessageSquare, BadgeCheck, Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MainNavbar from '../components/MainNavbar';
import MainFooter from '../components/MainFooter';
import ProductCard from '../components/ProductCard';
import api from '../api';
import { useCart } from '../context/CartContext';
import { useAlert } from '../context/AlertContext';
import { useWishlist } from '../context/WishlistContext';
import { decodeId } from '../utils/url';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || '';

const getColorCode = (name) => {
  const colors = {
    'black': '#1a1a1a',
    'white': '#ffffff',
    'red': '#ef4444',
    'blue': '#3b82f6',
    'green': '#22c55e',
    'yellow': '#eab308',
    'purple': '#a855f7',
    'orange': '#f97316',
    'pink': '#ec4899',
    'grey': '#6b7280',
    'gray': '#6b7280',
    'silver': '#cbd5e1',
    'gold': '#fbbf24',
    'brown': '#78350f',
    'navy': '#1e3a8a',
    'charcoal': '#374151',
    'matte black': '#111111',
    'cream': '#fffdd0',
    'beige': '#f5f5dc'
  };
  const normalized = name?.toLowerCase().trim();
  if (colors[normalized]) return colors[normalized];
  
  for (const [key, value] of Object.entries(colors)) {
    if (normalized?.includes(key)) return value;
  }
  
  return '#6b7280';
};

const ProductDetail = () => {
  const { id: rawId } = useParams();
  const { addToCart } = useCart();
  const { showAlert } = useAlert();
  const { toggleWishlist, isWishlisted } = useWishlist();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [added, setAdded] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);

  useEffect(() => {
    setLoading(true);
    window.scrollTo(0, 0);

    // Extract real ID from hashed parameter (slug-hash)
    const hash = rawId.includes('-') ? rawId.split('-').pop() : rawId;
    const realId = decodeId(hash);

    if (!realId) {
      setProduct(null);
      setLoading(false);
      return;
    }
    
    api.get(`/products/${realId}`)
      .then(r => {
        setProduct(r.data);
        if (r.data?.category_id) {
          api.get('/products')
            .then(allRes => {
                const all = Array.isArray(allRes.data) ? allRes.data : allRes.data?.products || [];
                const related = all
                .filter(p => p.category_id === r.data.category_id && p.id !== r.data.id)
                .slice(0, 4);
              setRelatedProducts(related);
            });
        }
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [rawId]);

  const images = product?.images?.length
    ? product.images.map(img => `${BACKEND_URL}${img.image_url}`)
    : product?.primary_image
      ? [`${BACKEND_URL}${product.primary_image}`]
      : [];

  const handleAddToCart = () => {
    if (!product) return;
    
    // Check if variant selection is required
    if (product.variants?.length > 0 && !selectedVariant) {
      showAlert('warning', 'Selection Required', 'Please choose a color before adding to your workspace collection.');
      
      // Scroll to variants section
      const variantSection = document.getElementById('variants-section');
      if (variantSection) {
        variantSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    addToCart({
      id: product.id,
      name: product.name,
      variant: selectedVariant?.color_name || null,
      image: images[0] || null,
      price: product.price + (parseFloat(selectedVariant?.price_extra) || 0),
    }, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleQuoteRequest = () => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const customerName = user?.full_name || user?.username || user?.email?.split('@')[0] || 'A prospective customer';
    const selectedColor = selectedVariant?.color_name || product.color || 'Standard';
    const currentImageUrl = images[activeImage] || (images.length > 0 ? images[0] : '');
    
    const message = `Hi, I'm ${customerName}, and I'm interested in the following product:
*Product:* ${product.name}
*SKU:* ${selectedVariant?.sku || product.sku || 'N/A'}
*Color:* ${selectedColor}
*Quantity:* ${quantity}
*Image Reference:* ${currentImageUrl}
*Link:* ${window.location.href}

Could you please provide a formal quote for this?`;

    const whatsappUrl = `https://wa.me/233507103200?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
        <MainNavbar />
        <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-500 font-medium animate-pulse">Loading perfection...</p>
            </div>
        </div>
        <MainFooter />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
        <MainNavbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 text-center">
          <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-2">
            <LayoutGrid className="w-10 h-10 text-gray-300" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Product Not Found</h1>
          <Link to="/products" className="flex items-center gap-2 bg-green-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-green-700 transition-all shadow-lg">
            <ArrowLeft className="w-4 h-4" /> Back to Catalog
          </Link>
        </div>
        <MainFooter />
      </div>
    );
  }

  const tabs = [
    { id: 'description', label: 'Description', icon: <FileText className="w-4 h-4" /> },
    { id: 'specs', label: 'Specifications', icon: <LayoutGrid className="w-4 h-4" /> },
    { id: 'shipping', label: 'Shipping & Returns', icon: <Truck className="w-4 h-4" /> },
  ];

  const stripHtml = (html) => {
    return html
      ?.replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <MainNavbar />

      <main className="pt-32 pb-20 px-4 md:px-6 max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2 text-xs md:text-sm text-gray-400">
                <Link to="/" className="hover:text-green-600 transition-colors">Home</Link>
                <span>/</span>
                <Link to="/products" className="hover:text-green-600 transition-colors">Products</Link>
                <span>/</span>
                <span className="text-gray-900 dark:text-white font-semibold line-clamp-1">{product.name}</span>
            </div>
            <div className="flex items-center gap-3">
                <button className="p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                    <Share2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
                <button 
                    onClick={() => toggleWishlist(product.id)}
                    className="p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors group"
                >
                    <Heart className={`w-4 h-4 group-hover:text-red-500 transition-colors ${isWishlisted(product.id) ? 'text-red-500 fill-current' : 'text-gray-600 dark:text-gray-400'}`} />
                </button>
            </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 xl:gap-20">
          {/* LEFT: Image Gallery */}
          <div className="space-y-6">
            <div className="relative aspect-square rounded-[2.5rem] overflow-hidden bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xl group">
              <AnimatePresence mode="wait">
                <motion.img
                  key={activeImage}
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4 }}
                  src={images[activeImage] || 'https://via.placeholder.com/600'}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </AnimatePresence>
              
              {!images.length && (
                <div className="w-full h-full flex items-center justify-center text-9xl">🪑</div>
              )}

              {/* Navigation Arrows */}
              {images.length > 1 && (
                <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none">
                  <button
                    onClick={() => setActiveImage(i => i > 0 ? i - 1 : i)}
                    className="w-10 h-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur rounded-xl flex items-center justify-center shadow-lg pointer-events-auto"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setActiveImage(i => i < images.length - 1 ? i + 1 : i)}
                    className="w-10 h-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur rounded-xl flex items-center justify-center shadow-lg pointer-events-auto"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            {/* Framed Gallery Carousel */}
            {images.length > 0 && (
                <div className="relative group/carousel px-8">
                    <div className="flex gap-6 overflow-x-auto py-4 scrollbar-hide snap-x" id="thumbnail-carousel">
                        {images.map((img, idx) => (
                            <button 
                                key={idx}
                                onClick={() => setActiveImage(idx)}
                                className={`flex-shrink-0 w-28 h-28 rounded-2xl overflow-hidden border-2 transition-all duration-500 snap-start p-1 bg-white dark:bg-gray-800 shadow-lg ${
                                    activeImage === idx 
                                        ? 'border-green-500 scale-95' 
                                        : 'border-transparent opacity-60 hover:opacity-100 hover:border-gray-200'
                                }`}
                            >
                                <img src={img} alt="" className="w-full h-full object-cover rounded-xl" />
                            </button>
                        ))}
                    </div>
                    
                    {/* Carousel Nav Arrows */}
                    {images.length > 3 && (
                        <>
                            <button 
                                onClick={() => document.getElementById('thumbnail-carousel').scrollBy({ left: -200, behavior: 'smooth' })}
                                className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-gray-100 dark:border-gray-800 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95"
                            >
                                <ChevronLeft size={20} className="text-gray-900 dark:text-white" />
                            </button>
                            <button 
                                onClick={() => document.getElementById('thumbnail-carousel').scrollBy({ left: 200, behavior: 'smooth' })}
                                className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-gray-100 dark:border-gray-800 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95"
                            >
                                <ChevronRight size={20} className="text-gray-900 dark:text-white" />
                            </button>
                        </>
                    )}
                </div>
            )}
          </div>

          {/* RIGHT: Product Info */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-4">
                {product.category_name && (
                    <span className="px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-600 text-[10px] font-bold rounded uppercase">
                        {product.category_name}
                    </span>
                )}
                <div className="flex items-center gap-1 text-yellow-500 ml-auto">
                    <Star className="w-3 h-3 fill-current" />
                    <span className="text-xs font-bold text-gray-500">4.9 (48 Reviews)</span>
                </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white leading-tight mb-6">
              {product.name}
            </h1>

            <div className="flex items-baseline gap-4 mb-8">
              <span className="text-4xl font-black text-gray-900 dark:text-white text-green-600">
                ₵{parseFloat(product.price).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
              </span>
              {product.discount_price > 0 && (
                <span className="text-xl text-gray-400 line-through font-bold">
                  ₵{parseFloat(product.discount_price).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>

            {/* Description Short */}
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-8 text-lg line-clamp-3">
                {stripHtml(product.description)?.substring(0, 160)}...
            </p>

            {/* Variants */}
            {product.variants?.length > 0 && (
              <div id="variants-section" className="mb-10 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase tracking-widest text-gray-500">Available Colors</h4>
                  {product.variants?.length > 0 && !selectedVariant && (
                    <span className="text-[10px] font-bold text-red-500 animate-pulse">Choose one</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-3">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      className={`px-4 py-2.5 rounded-xl border-2 transition-all flex items-center gap-3 ${
                        selectedVariant?.id === v.id
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/10 text-green-600'
                          : 'border-gray-100 dark:border-gray-800 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <div 
                        className="w-3 h-3 rounded-full border border-gray-200" 
                        style={{ backgroundColor: v.color_code || getColorCode(v.color_name) }}
                      />
                      <span className="text-xs font-bold uppercase">{v.color_name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="space-y-6 mb-10 pb-10 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-gray-50 dark:bg-gray-900 rounded-xl p-1 border border-gray-100 dark:border-gray-800">
                        <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="p-3"><Minus size={16} /></button>
                        <span className="w-10 text-center font-bold">{quantity}</span>
                        <button onClick={() => setQuantity(q => q + 1)} className="p-3"><Plus size={16} /></button>
                    </div>
                    <div className="flex-1">
                        <p className="text-xs font-black text-green-600 uppercase">
                          {selectedVariant 
                            ? `In Stock: ${selectedVariant.stock_quantity} available`
                            : `In Stock: ${product.stock} available`}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button onClick={handleAddToCart} className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 rounded-xl font-black flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-xl">
                        {added ? <CheckCircle size={20} /> : <ShoppingBag size={20} />}
                        {added ? 'Added' : 'Add to Cart'}
                    </button>
                    <button onClick={handleQuoteRequest} className="bg-green-600 text-white py-4 rounded-xl font-black flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-xl">
                        <MessageSquare size={20} />
                        Get Quote
                    </button>
                </div>
            </div>

            {/* Selling Points Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-green-50 dark:bg-green-900/10 p-5 rounded-3xl flex items-center gap-4 border border-green-100 dark:border-green-800/20">
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm italic">
                        <Truck className="text-green-600" />
                    </div>
                    <div>
                        <p className="text-[11px] font-black uppercase text-gray-900 dark:text-white tracking-widest">Fast Delivery</p>
                        <p className="text-[10px] text-gray-500">2-4 Business Days</p>
                    </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-3xl flex items-center gap-4 border border-blue-100 dark:border-blue-800/20">
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
                        <ShieldCheck className="text-blue-500" />
                    </div>
                    <div>
                        <p className="text-[11px] font-black uppercase text-gray-900 dark:text-white tracking-widest">Warranty</p>
                        <p className="text-[10px] text-gray-500">24 Month Coverage</p>
                    </div>
                </div>
            </div>

            {/* Meta */}
            <div className="space-y-2 pt-6 border-t border-gray-100 dark:border-gray-800">
                <div className="flex justify-between text-[11px] uppercase font-bold tracking-widest">
                    <span className="text-gray-400">Model SKU</span>
                    <span className="text-gray-900 dark:text-white">{selectedVariant?.sku || product.sku}</span>
                </div>
                <div className="flex justify-between text-[11px] uppercase font-bold tracking-widest">
                    <span className="text-gray-400">Product Range</span>
                    <span className="text-gray-900 dark:text-white">Expert Collective</span>
                </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-24">
            <div className="flex border-b border-gray-100 dark:border-gray-800 mb-12">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-4 text-xs font-black uppercase tracking-widest relative ${
                            activeTab === tab.id ? 'text-green-600' : 'text-gray-400'
                        }`}
                    >
                        {tab.icon} {tab.label}
                        {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-500 rounded-t-full" />}
                    </button>
                ))}
            </div>

            <div className="max-w-4xl">
                {activeTab === 'description' && (
                    <div className="animate-fadeIn">
                        <h3 className="text-xl font-black mb-6 uppercase tracking-widest text-green-600">Product Narrative</h3>
                        <div 
                            className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg"
                            dangerouslySetInnerHTML={{ __html: product.description }}
                        />
                    </div>
                )}

                {activeTab === 'specs' && (
                    <div className="grid md:grid-cols-2 gap-4 animate-fadeIn">
                        {[
                            { label: 'Dimensions', value: product.dimensions },
                            { label: 'Weight Capacity', value: product.weight_capacity },
                            { label: 'Material', value: product.material },
                            { label: 'Fabric Type', value: product.fabric_type },
                            { label: 'Warranty', value: product.warranty },
                            { label: 'Certifications', value: product.certifications },
                        ].map((spec, i) => (
                            <div key={i} className="flex justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                                <span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">{spec.label}</span>
                                <span className="text-gray-900 dark:text-white font-bold">{spec.value || 'Contact Support'}</span>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'shipping' && (
                    <div className="p-8 bg-green-50 dark:bg-green-900/10 rounded-3xl animate-fadeIn">
                        <div className="flex gap-4 mb-8">
                            <Truck className="text-green-600" />
                            <div>
                                <h4 className="font-black mb-2 uppercase tracking-widest text-[11px]">Delivery Policy</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400 font-bold uppercase">IMMEDIATE</p>
                                <p className="text-xs text-gray-500 mt-1">We maintain a high-inventory standard to ensure your workspace is transformed without delay.</p>
                            </div>
                        </div>
                        <div className="flex gap-4 mb-8">
                            <ShieldCheck className="text-blue-600" />
                            <div>
                                <h4 className="font-black mb-2 uppercase tracking-widest text-[11px]">Returns & Installation</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400 font-bold uppercase transition-colors">All goods are considered accepted once installed and cannot be returned afterwards.</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <BadgeCheck className="text-purple-600" />
                            <div>
                                <h4 className="font-black mb-2 uppercase tracking-widest text-[11px]">Official Warranty</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400 font-bold uppercase">3 YEARS</p>
                                <p className="text-xs text-gray-500 mt-1">Our products are engineered for longevity, backed by a comprehensive 3-year structural warranty.</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Related */}
        {relatedProducts.length > 0 && (
            <div className="mt-32 pt-32 border-t border-gray-100 dark:border-gray-800">
                <h2 className="text-3xl font-black mb-12">Complete the Look</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {relatedProducts.map(p => <ProductCard key={p.id} product={p} />)}
                </div>
            </div>
        )}
      </main>

      <MainFooter />
    </div>
  );
};

export default ProductDetail;
