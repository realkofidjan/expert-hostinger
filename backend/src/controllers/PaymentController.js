const axios = require('axios');
const db = require('../config/db');

const PaymentController = {
  // Initialize Paystack transaction for a MoMo order
  initialize: async (req, res) => {
    const { orderId } = req.body;
    const secretKey = (process.env.PAYSTACK_SECRET_KEY || '').trim();

    if (!secretKey || secretKey === 'sk_test_placeholder') {
      return res.status(500).json({ error: 'Paystack Secret Key is not configured' });
    }

    try {
      const [orders] = await db.query(
        'SELECT * FROM orders WHERE id = ? AND payment_method = "momo"',
        [orderId]
      );

      if (!orders.length) {
        return res.status(404).json({ error: 'Order not found or not a MoMo order' });
      }

      const order = orders[0];
      if (order.payment_status === 'paid') {
        return res.status(400).json({ error: 'This order has already been paid' });
      }

      const amountInKobo = Math.round(parseFloat(order.total_amount) * 100);
      if (amountInKobo <= 0) {
        return res.status(400).json({ error: 'Invalid transaction amount' });
      }

      const reference = `EXP-${Date.now()}-${orderId}`;

      const response = await axios.post('https://api.paystack.co/transaction/initialize', {
        email: order.customer_email,
        amount: amountInKobo,
        currency: 'GHS',
        reference,
        channels: ['mobile_money'],
        metadata: {
          order_id: orderId,
          order_number: order.order_number,
          customer_name: order.customer_name
        },
        callback_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/order-success?ref=${reference}&orderId=${orderId}`
      }, {
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json'
        }
      });

      const userId = req.user?.id || null;
      await db.query(
        'INSERT INTO payments (user_id, order_id, reference, amount, status) VALUES (?, ?, ?, ?, "pending")',
        [userId, orderId, reference, order.total_amount]
      );

      res.json(response.data.data);
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      console.error('PAYMENT_INIT_ERROR:', errorMsg);
      res.status(err.response?.status || 500).json({ error: 'Payment initialization failed', details: errorMsg });
    }
  },

  // Verify Paystack transaction
  verify: async (req, res) => {
    const { reference } = req.params;
    const secretKey = (process.env.PAYSTACK_SECRET_KEY || '').trim();

    try {
      const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: { Authorization: `Bearer ${secretKey}` }
      });

      const data = response.data.data;
      if (data.status === 'success') {
        const orderId = data.metadata?.order_id;

        await db.query(
          'UPDATE payments SET status = "success", updated_at = NOW() WHERE reference = ?',
          [reference]
        );
        if (orderId) {
          await db.query(
            'UPDATE orders SET payment_status = "paid", status = "confirmed", updated_at = NOW() WHERE id = ?',
            [orderId]
          );
        }

        res.json({ message: 'Payment verified successfully', data });
      } else {
        res.status(400).json({ error: 'Payment verification failed', status: data.status });
      }
    } catch (err) {
      console.error('PAYMENT_VERIFY_ERROR:', err.response?.data || err.message);
      res.status(500).json({ error: 'Failed to verify payment' });
    }
  },

  // Paystack webhook
  webhook: async (req, res) => {
    const event = req.body;
    if (event.event === 'charge.success') {
      const { reference, metadata } = event.data;
      const orderId = metadata?.order_id;
      await db.query('UPDATE payments SET status = "success", updated_at = NOW() WHERE reference = ?', [reference]);
      if (orderId) {
        await db.query(
          'UPDATE orders SET payment_status = "paid", status = "confirmed", updated_at = NOW() WHERE id = ?',
          [orderId]
        );
      }
    }
    res.sendStatus(200);
  }
};

module.exports = PaymentController;
