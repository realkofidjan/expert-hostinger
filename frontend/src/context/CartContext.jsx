import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('eof-cart') || '[]'); }
    catch { return []; }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('eof-cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = useCallback((product, qty = 1) => {
    setCartItems(prev => {
      // Create a unique key for the cart item based on product ID AND variant
      const existing = prev.find(i => i.id === product.id && i.variant === product.variant);
      
      if (existing) {
        return prev.map(i => 
          (i.id === product.id && i.variant === product.variant) 
            ? { ...i, quantity: i.quantity + qty } 
            : i
        );
      }
      
      return [...prev, {
        id: product.id,
        name: product.name,
        variant: product.variant || null, // Track the selected color/variant
        image: product.image || null,
        price: product.price || null,
        quantity: qty,
      }];
    });
    setIsCartOpen(true);
  }, []);

  const removeFromCart = useCallback((id, variant = null) => {
    setCartItems(prev => prev.filter(i => !(i.id === id && i.variant === variant)));
  }, []);

  const updateQuantity = useCallback((id, qty, variant = null) => {
    if (qty < 1) {
      setCartItems(prev => prev.filter(i => !(i.id === id && i.variant === variant)));
      return;
    }
    setCartItems(prev => prev.map(i => (i.id === id && i.variant === variant) ? { ...i, quantity: qty } : i));
  }, []);

  const clearCart = useCallback(() => setCartItems([]), []);

  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{
      cartItems, addToCart, removeFromCart, updateQuantity, clearCart,
      isCartOpen, setIsCartOpen, cartCount,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
