import React from 'react';
import { Link } from 'react-router-dom';
import { X, ShoppingCart, Plus, Minus, Trash2, ArrowRight, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { createProductUrl } from '../utils/url';
import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';

const CartSidebar = () => {
  const { cartItems, isCartOpen, setIsCartOpen, removeFromCart, updateQuantity, clearCart, cartCount } = useCart();

  const subtotal = cartItems.reduce((sum, i) => sum + (parseFloat(i.price || 0) * i.quantity), 0);

  return (
    <Drawer open={isCartOpen} onOpenChange={setIsCartOpen} direction="right">
      <DrawerContent>
        {/* Header */}
        <DrawerHeader className="relative">
          <div className="flex items-center justify-between w-full">
            <DrawerClose asChild>
              <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </DrawerClose>
            <div className="flex items-center gap-3">
              {cartCount > 0 && (
                <span className="px-2.5 py-1 bg-green-500/10 text-green-600 dark:text-green-400 text-[10px] font-black rounded-full border border-green-500/20">
                  {cartCount}
                </span>
              )}
              <DrawerTitle className="text-right">Your Cart</DrawerTitle>
            </div>
          </div>
          <DrawerDescription className="text-right">
            {cartItems.length > 0
              ? 'Review your architectural selections'
              : 'Your gallery is currently empty'}
          </DrawerDescription>
        </DrawerHeader>

        {/* Body */}
        <DrawerBody>
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-12">
              <div className="w-24 h-24 rounded-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center shadow-inner">
                <ShoppingBag className="w-10 h-10 text-gray-300 dark:text-gray-700" />
              </div>
              <div>
                <p className="font-black text-gray-900 dark:text-white text-lg mb-1">Empty Selection</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[200px] mx-auto">
                  Discover our premium collection and start your project.
                </p>
              </div>
              <DrawerClose asChild>
                <Button variant="outline" className="mt-4 rounded-2xl px-8 h-12 font-bold bg-white dark:bg-gray-900">
                  Browse Gallery
                </Button>
              </DrawerClose>
            </div>
          ) : (
            <div className="space-y-6">
              {cartItems.map((item) => (
                <div key={`${item.id}-${item.variant}`} className="flex gap-4 group">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-white/5">
                    {item.image
                      ? <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      : <div className="w-full h-full flex items-center justify-center text-2xl">🪑</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-3">
                      <Link to={createProductUrl({ id: item.id, name: item.name })} className="flex-1 min-w-0" onClick={() => setIsCartOpen(false)}>
                        <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight truncate hover:text-green-600 transition-colors">
                          {item.name}
                        </p>
                      </Link>
                      <p className="text-sm font-black text-gray-900 dark:text-white shrink-0">
                        ₵{(parseFloat(item.price || 0) * item.quantity).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="flex items-end justify-between mt-3">
                      <div className="flex flex-col gap-1.5 min-w-0">
                        {item.variant && (
                          <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-md w-fit">
                            <span className="w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-600" />
                            <span className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none truncate max-w-[80px]">
                              {item.variant}
                            </span>
                          </div>
                        )}
                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 py-0.5 whitespace-nowrap">
                          ₵{parseFloat(item.price || 0).toLocaleString('en-GH', { minimumFractionDigits: 2 })} each
                        </span>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-1 p-0.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1, item.variant)}
                            className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm transition-all"
                          >
                            <Minus className="w-2.5 h-2.5 text-gray-600 dark:text-gray-400" />
                          </button>
                          <span className="text-[10px] font-black text-gray-900 dark:text-white w-5 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1, item.variant)}
                            className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm transition-all"
                          >
                            <Plus className="w-2.5 h-2.5 text-gray-600 dark:text-gray-400" />
                          </button>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromCart(item.id, item.variant)}
                          className="h-8 px-3 text-[9px] font-black text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 border border-transparent hover:border-red-200 dark:hover:border-red-800/30"
                        >
                          <Trash2 className="w-3 h-3" /> Remove Selection
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DrawerBody>

        {/* Footer */}
        {cartItems.length > 0 && (
          <DrawerFooter>
            <div className="space-y-4 mb-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[10px]">Subtotal Cost</span>
                <span className="font-black text-lg text-gray-900 dark:text-white">
                  ₵{subtotal.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-[11px] text-center text-gray-400 dark:text-gray-500 font-medium">
                Logistics and taxes calculated at final checkout.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Link to="/cart" onClick={() => setIsCartOpen(false)} className="w-full">
                <Button className="w-full h-14 bg-gradient-to-r from-green-600 to-yellow-500 text-white font-black rounded-2xl hover:shadow-[0_0_30px_rgba(34,197,94,0.3)] border-none text-base">
                  Secure Checkout <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <button
                onClick={clearCart}
                className="w-full text-[11px] text-gray-400 hover:text-red-500 font-black uppercase tracking-widest transition-colors py-2"
              >
                Clear Entire Selection
              </button>
            </div>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
};

export default CartSidebar;
