import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api';
import { toast } from 'react-toastify';

const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
    const [wishlist, setWishlist] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchWishlist = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setWishlist([]);
            return;
        }

        try {
            setLoading(true);
            const res = await api.get('/wishlist');
            setWishlist(res.data || []);
        } catch (error) {
            console.error('FETCH_WISHLIST_ERROR:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchWishlist();
    }, [fetchWishlist]);

    const toggleWishlist = async (productId) => {
        const token = localStorage.getItem('token');
        if (!token) {
            toast.info('Please log in to save favorites');
            return false;
        }

        try {
            const res = await api.post('/wishlist/toggle', { productId });
            const isWishlisted = res.data.isWishlisted;
            
            // Optimistic update
            if (isWishlisted) {
                // We don't have the full product object here, so we refresh
                fetchWishlist();
            } else {
                setWishlist(prev => prev.filter(item => item.id !== productId));
            }
            
            toast.success(res.data.message);
            return true;
        } catch (error) {
            toast.error('Failed to update wishlist');
            return false;
        }
    };

    const isWishlisted = (productId) => {
        return wishlist.some(item => item.id === productId);
    };

    return (
        <WishlistContext.Provider value={{
            wishlist,
            loading,
            fetchWishlist,
            toggleWishlist,
            isWishlisted
        }}>
            {children}
        </WishlistContext.Provider>
    );
};

export const useWishlist = () => {
    const context = useContext(WishlistContext);
    if (!context) {
        throw new Error('useWishlist must be used within a WishlistProvider');
    }
    return context;
};
