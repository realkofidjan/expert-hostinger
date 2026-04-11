const db = require('../config/db');

/**
 * @desc    Get all reviews for a product
 * @route   GET /api/reviews/product/:productId
 */
const getProductReviews = async (req, res) => {
    try {
        const [reviews] = await db.query(`
            SELECT r.*, u.full_name as user_name
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.product_id = ? AND r.status = 'approved'
            ORDER BY r.created_at DESC
        `, [req.params.productId]);
        
        // Calculate average rating
        const [stats] = await db.query(`
            SELECT AVG(rating) as average_rating, COUNT(*) as total_reviews
            FROM reviews
            WHERE product_id = ? AND status = 'approved'
        `, [req.params.productId]);

        res.json({
            reviews,
            stats: stats[0]
        });
    } catch (error) {
        console.error('GET_REVIEWS_ERROR:', error);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
};

/**
 * @desc    Submit a review
 * @route   POST /api/reviews
 */
const submitReview = async (req, res) => {
    try {
        const { product_id, rating, comment } = req.body;
        const user_id = req.user.id;

        if (!product_id || !rating) {
            return res.status(400).json({ error: 'Product ID and rating are required' });
        }

        // Verify that the user has ordered and received this product
        const [orders] = await db.query(`
            SELECT o.id 
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            WHERE o.user_id = ? 
            AND oi.product_id = ?
            AND o.status IN ('delivered', 'collected')
            LIMIT 1
        `, [user_id, product_id]);

        if (orders.length === 0) {
            return res.status(403).json({ error: 'You can only review products you have purchased and received.' });
        }

        // Insert or update review
        await db.query(`
            INSERT INTO reviews (product_id, user_id, rating, comment, status)
            VALUES (?, ?, ?, ?, 'approved')
            ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment), updated_at = CURRENT_TIMESTAMP
        `, [product_id, user_id, rating, comment || null]);

        res.json({ message: 'Review submitted successfully' });
    } catch (error) {
        console.error('SUBMIT_REVIEW_ERROR:', error);
        res.status(500).json({ error: 'Failed to submit review' });
    }
};

/**
 * @desc    Get all reviews (Admin)
 * @route   GET /api/admin/reviews
 */
const getAllReviewsAdmin = async (req, res) => {
    try {
        const [reviews] = await db.query(`
            SELECT r.*, u.full_name as user_name, u.email, p.name as product_name
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            JOIN products p ON r.product_id = p.id
            ORDER BY r.created_at DESC
        `);
        res.json(reviews);
    } catch (error) {
        console.error('GET_ALL_REVIEWS_ERROR:', error);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
};

/**
 * @desc    Delete or update review status (Admin)
 * @route   DELETE /api/admin/reviews/:id
 */
const deleteReviewAdmin = async (req, res) => {
    try {
        await db.query('DELETE FROM reviews WHERE id = ?', [req.params.id]);
        res.json({ message: 'Review deleted successfully' });
    } catch (error) {
        console.error('DELETE_REVIEW_ERROR:', error);
        res.status(500).json({ error: 'Failed to delete review' });
    }
};

module.exports = {
    getProductReviews,
    submitReview,
    getAllReviewsAdmin,
    deleteReviewAdmin
};
