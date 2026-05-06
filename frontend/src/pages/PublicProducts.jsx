import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import MainNavbar from '../components/MainNavbar';
import MainFooter from '../components/MainFooter';
import api from '../api';
import { PrismFluxLoader } from '../components/ui/prism-flux-loader';
import ProductCard from '../components/ProductCard';

const PublicProducts = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [activeCategory, setActiveCategory] = useState(searchParams.get('category') || 'all');
  const [pagination, setPagination] = useState({ total: 0, pages: 1, currentPage: 1 });
  const [colors, setColors] = useState([]);
  const [selectedColor, setSelectedColor] = useState(searchParams.get('color') || 'all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const searchRef = useRef(null);
  const productsRef = useRef(null);

  useEffect(() => {
    const q = searchParams.get('q') || '';
    setSearchQuery(q);
  }, [searchParams]);

  const fetchProducts = () => {
    setLoading(true);
    const q = searchParams.get('q') || '';
    const cat = searchParams.get('category') || 'all';
    const page = searchParams.get('page') || 1;
    const color = searchParams.get('color') || 'all';

    let url = `/products?q=${q}&category=${cat}&page=${page}`;
    if (color && color !== 'all') url += `&color=${color}`;

    api.get(url)
      .then(res => {
        setProducts(res.data?.products || []);
        setPagination(res.data?.pagination || { total: 0, pages: 1, currentPage: 1 });
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get('/categories')
      .then(res => setCategories(res.data?.categories || res.data || []))
      .catch(() => setCategories([]));
    api.get('/products/meta')
      .then(res => setColors(res.data?.colors || []))
      .catch(() => {});
  }, []);

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => { fetchProducts(); }, [searchParams]);

  const isMounted = useRef(false);
  useEffect(() => {
    if (!isMounted.current) { isMounted.current = true; return; }
    if (productsRef.current) {
      const offset = 120;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = productsRef.current.getBoundingClientRect().top;
      window.scrollTo({ top: elementRect - bodyRect - offset, behavior: 'smooth' });
    }
  }, [searchParams]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) setSearchParams({ q: searchQuery.trim() });
    else setSearchParams({});
  };

  const clearSearch = () => { setSearchQuery(''); setSearchParams({}); };

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage);
    setSearchParams(params);
  };

  const handleCategoryChange = (catId) => {
    setActiveCategory(catId);
    const params = new URLSearchParams(searchParams);
    params.set('category', catId);
    params.set('page', 1);
    setSearchParams(params);
  };

  const handleColorChange = (color) => {
    setSelectedColor(color);
    const params = new URLSearchParams(searchParams);
    if (color && color !== 'all') params.set('color', color); else params.delete('color');
    params.set('page', 1);
    setSearchParams(params);
    setIsFilterOpen(false);
  };

  const resetFilters = () => {
    setSelectedColor('all');
    const params = new URLSearchParams(searchParams);
    params.delete('color');
    params.set('page', 1);
    setSearchParams(params);
  };

  const getColorCode = (colorName) => {
    const colors = {
      'Black': '#000000', 'White': '#FFFFFF', 'Grey': '#808080', 'Red': '#FF0000',
      'Blue': '#0000FF', 'Green': '#008000', 'Brown': '#A52A2A', 'Gold': '#FFD700',
      'Silver': '#C0C0C0', 'Beige': '#F5F5DC', 'Oak': '#DEB887', 'Walnut': '#5D4037',
      'Cherry': '#8B0000', 'Tan': '#D2B48C',
    };
    return colors[colorName] || '#CCCCCC';
  };

  const currentQuery = searchParams.get('q');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <MainNavbar />

      {/* Page header */}
      <div className="pt-36 pb-12 px-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-end gap-6 justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white leading-tight mb-2">
                {currentQuery ? (
                  <>Results for <span className="text-green-600">"{currentQuery}"</span></>
                ) : (
                  <>Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-yellow-500">Products</span></>
                )}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                {loading ? 'Loading...' : `${products.length} product${products.length !== 1 ? 's' : ''} found`}
              </p>
            </div>

            {/* Search bar */}
            <form onSubmit={handleSearchSubmit} ref={searchRef} className="w-full lg:w-[400px]">
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 focus-within:border-green-500 focus-within:ring-1 focus-within:ring-green-500 transition-all">
                <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none"
                />
                {searchQuery && (
                  <button type="button" onClick={clearSearch} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button type="submit" className="px-4 py-1.5 bg-green-600 text-white text-xs font-bold rounded-xl hover:bg-green-700 transition-colors">
                  Search
                </button>
              </div>
            </form>
          </div>

          {/* Category filter pills */}
          {categories.length > 0 && (
            <div className="flex gap-2 flex-wrap mt-6">
              <button
                onClick={() => handleCategoryChange('all')}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 ${activeCategory === 'all'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 ${activeCategory == cat.id
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div ref={productsRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col lg:flex-row gap-10">

          {/* Sidebar — Desktop */}
          <aside className="hidden lg:block w-56 flex-shrink-0 space-y-6 sticky top-32 h-fit">
            {colors.length > 0 && (
              <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm">
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white mb-5">Colour</h3>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => handleColorChange('all')}
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${selectedColor === 'all' ? 'border-green-500 scale-110' : 'border-transparent'}`}
                    title="All Colours"
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-red-500 via-green-500 to-blue-500" />
                  </button>
                  {colors.map(c => (
                    <button
                      key={c}
                      onClick={() => handleColorChange(c)}
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${selectedColor === c ? 'border-green-500 scale-110' : 'border-transparent'}`}
                      title={c}
                    >
                      <div
                        className="w-6 h-6 rounded-full border border-gray-100 dark:border-gray-800"
                        style={{ backgroundColor: getColorCode(c) }}
                      />
                    </button>
                  ))}
                </div>
                {selectedColor !== 'all' && (
                  <button onClick={resetFilters} className="mt-4 text-[10px] text-gray-400 hover:text-green-600 font-bold uppercase tracking-widest transition-colors">
                    Clear filter
                  </button>
                )}
              </div>
            )}
          </aside>

          {/* Mobile filter trigger */}
          {colors.length > 0 && (
            <div className="lg:hidden flex justify-between items-center mb-4">
              <button
                onClick={() => setIsFilterOpen(true)}
                className="flex items-center gap-2 bg-white dark:bg-gray-900 px-5 py-3 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm font-bold text-sm"
              >
                <SlidersHorizontal className="w-4 h-4" /> Filter by Colour
              </button>
            </div>
          )}

          {/* Products grid */}
          <div className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <PrismFluxLoader size={50} />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-24">
                <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-6">
                  <Search className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">No products found</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  {currentQuery ? `No results for "${currentQuery}"` : 'Try adjusting your filters to find what you need.'}
                </p>
                <button onClick={resetFilters} className="px-6 py-3 bg-green-600 text-white font-bold rounded-2xl hover:bg-green-700 transition-colors">
                  Reset filters
                </button>
              </div>
            ) : (
              <div className="space-y-12">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {products.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {pagination.pages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-8 border-t border-gray-100 dark:border-gray-800">
                    <button
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={pagination.currentPage === 1}
                      className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-gray-800 transition-all font-bold text-sm"
                    >
                      Previous
                    </button>
                    <div className="flex gap-1">
                      {[...Array(pagination.pages)].map((_, i) => {
                        const pageNum = i + 1;
                        if (pagination.pages > 7) {
                          if (pageNum !== 1 && pageNum !== pagination.pages && Math.abs(pageNum - pagination.currentPage) > 1) {
                            if (pageNum === 2 || pageNum === pagination.pages - 1) return <span key={pageNum} className="px-1 text-gray-400">...</span>;
                            return null;
                          }
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${
                              pagination.currentPage === pageNum
                                ? 'bg-green-600 text-white shadow-lg shadow-green-600/25'
                                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      disabled={pagination.currentPage === pagination.pages}
                      className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-gray-800 transition-all font-bold text-sm"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Colour filter drawer */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsFilterOpen(false)} />
          <aside className="absolute bottom-0 left-0 right-0 max-h-[70vh] bg-white dark:bg-gray-950 rounded-t-[3rem] p-8 overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">Filter by Colour</h2>
              <button onClick={() => setIsFilterOpen(false)} className="p-2 rounded-full bg-gray-100 dark:bg-gray-800">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleColorChange('all')}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${selectedColor === 'all' ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}
              >
                All
              </button>
              {colors.map(c => (
                <button
                  key={c}
                  onClick={() => handleColorChange(c)}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${selectedColor === c ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </aside>
        </div>
      )}

      <MainFooter />
    </div>
  );
};

export default PublicProducts;
