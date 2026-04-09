const Wishlist = require('../models/Wishlist');

/**
 * @desc    Toggle wishlist item
 * @route   POST /api/wishlist/toggle
 */
const toggleWishlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId } = req.body;

        if (!productId) {
            return res.status(400).json({ error: 'Product ID is required' });
        }

        const isFavorited = await Wishlist.isWishlisted(userId, productId);
        
        if (isFavorited) {
            await Wishlist.remove(userId, productId);
            return res.json({ message: 'Removed from wishlist', isWishlisted: false });
        } else {
            await Wishlist.add(userId, productId);
            return res.json({ message: 'Added to wishlist', isWishlisted: true });
        }
    } catch (error) {
        console.error('TOGGLE_WISHLIST_ERROR:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

/**
 * @desc    Get user wishlist
 * @route   GET /api/wishlist
 */
const getWishlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const items = await Wishlist.getByUser(userId);
        res.json(items);
    } catch (error) {
        console.error('GET_WISHLIST_ERROR:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

/**
 * @desc    Check if product is in wishlist
 * @route   GET /api/wishlist/check/:productId
 */
const checkWishlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId } = req.params;
        const isWishlisted = await Wishlist.isWishlisted(userId, productId);
        res.json({ isWishlisted });
    } catch (error) {
        console.error('CHECK_WISHLIST_ERROR:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

module.exports = {
    toggleWishlist,
    getWishlist,
    checkWishlist
};
