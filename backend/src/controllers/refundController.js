// backend/src/controllers/refundController.js
const db = require('../config/db');
const { addRefundJob } = require('../jobs/queues');
const { v4: uuidv4 } = require('uuid');

const createRefund = async (req, res) => {
  const { paymentId } = req.params;
  const { amount, reason } = req.body;
  const merchantId = req.merchant.id;

  if (!amount) return res.status(400).json({ error: 'Amount is required' });

  try {
    // 1. Verify Payment & Ownership
    const payRes = await db.query(
      'SELECT * FROM payments WHERE id = $1 AND merchant_id = $2',
      [paymentId, merchantId]
    );
    const payment = payRes.rows[0];

    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (payment.status !== 'success') {
      return res.status(400).json({ 
        error: { code: "BAD_REQUEST_ERROR", description: "Payment not in capturable state" } 
      });
    }

    // 2. Calculate already refunded amount
    const refundRes = await db.query(
      "SELECT SUM(amount) as total FROM refunds WHERE payment_id = $1 AND status != 'failed'",
      [paymentId]
    );
    const totalRefunded = parseInt(refundRes.rows[0].total || 0);

    // 3. Validate Limit
    if (amount + totalRefunded > payment.amount) {
      return res.status(400).json({
        error: { code: "BAD_REQUEST_ERROR", description: "Refund amount exceeds available amount" }
      });
    }

    // 4. Create Refund Record
    const refundId = `rfnd_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
    const newRefund = {
      id: refundId,
      payment_id: paymentId,
      merchant_id: merchantId,
      amount,
      reason,
      status: 'pending',
      created_at: new Date()
    };

    await db.query(
      `INSERT INTO refunds (id, payment_id, merchant_id, amount, reason, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [refundId, paymentId, merchantId, amount, reason, 'pending', newRefund.created_at]
    );

    // 5. Enqueue Job
    await addRefundJob({ refundId });

    res.status(201).json(newRefund);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getRefund = async (req, res) => {
  const { refundId } = req.params;
  try {
    const result = await db.query('SELECT * FROM refunds WHERE id = $1', [refundId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Refund not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { createRefund, getRefund };