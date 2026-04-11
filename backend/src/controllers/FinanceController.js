const db = require('../config/db');

/**
 * @desc    Get financial statistics for dashboard
 * @route   GET /api/admin/finance
 */
const getFinanceStats = async (req, res) => {
    try {
        const [
            [totalRevRow],
            [monthRevRow],
            [unpaidRevRow],
            [ordersCountRow],
            [onlineOrdersRow],
            [offlineOrdersRow],
            pmBreakdown
        ] = await Promise.all([
            db.query(`SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE payment_status IN ('paid', 'verified')`),
            db.query(`SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE payment_status IN ('paid', 'verified') AND MONTH(created_at) = MONTH(CURRENT_DATE()) AND YEAR(created_at) = YEAR(CURRENT_DATE())`),
            db.query(`SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE payment_status NOT IN ('paid', 'verified') AND status != 'cancelled'`),
            db.query(`SELECT COUNT(*) as total FROM orders`),
            db.query(`SELECT COUNT(*) as count FROM orders WHERE delivery_mode IN ('delivery', 'pickup') AND customer_email != 'offline@expertoffice.com'`),
            db.query(`SELECT COUNT(*) as count FROM orders WHERE customer_email = 'offline@expertoffice.com'`),
            db.query(`SELECT payment_method as method, COALESCE(SUM(total_amount), 0) as total FROM orders WHERE payment_status IN ('paid', 'verified') GROUP BY payment_method`)
        ]);

        const totalRevenue = parseFloat(totalRevRow[0].total) || 0;
        const totalOrdersComplete = parseFloat(onlineOrdersRow[0].count) + parseFloat(offlineOrdersRow[0].count); // Rough approx for now
        const allOrders = parseFloat(ordersCountRow[0].total) || 1;
        const averageOrderValue = totalOrdersComplete > 0 ? (totalRevenue / totalOrdersComplete) : 0;

        res.json({
            totalRevenue,
            thisMonthRevenue: parseFloat(monthRevRow[0].total) || 0,
            unpaidRevenue: parseFloat(unpaidRevRow[0].total) || 0,
            averageOrderValue: averageOrderValue,
            paymentMethods: pmBreakdown[0] || [],
            orderCounts: {
                total: allOrders,
                online: parseFloat(onlineOrdersRow[0].count) || 0,
                offline: parseFloat(offlineOrdersRow[0].count) || 0
            }
        });
    } catch (error) {
        console.error('GET_FINANCE_STATS_ERROR:', error);
        res.status(500).json({ error: 'Failed to fetch financial stats' });
    }
};

module.exports = {
    getFinanceStats
};
