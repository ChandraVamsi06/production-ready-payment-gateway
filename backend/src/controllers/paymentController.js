// backend/src/controllers/paymentController.js
const db = require('../config/db');
const { addPaymentJob } = require('../jobs/queues');
const { v4: uuidv4 } = require('uuid');

const createPayment = async (req, res) => {
  const { amount, currency, method, order_id, vpa } = req.body;
  const merchantId = req.merchant.id;

  // Basic Validation
  if (!amount || !method) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Generate ID
  const paymentId = `pay_${uuidv4().replace(/-/g, '').substring(0, 15)}`;

  try {
    // 1. Create DB Record (Status: pending)
    await db.query(
      `INSERT INTO payments (id, merchant_id, order_id, amount, currency, method, vpa, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
      [paymentId, merchantId, order_id, amount, currency || 'INR', method, vpa]
    );

    // 2. Enqueue Job
    await addPaymentJob({ paymentId });

    // 3. Return Immediate Response
    const response = {
      id: paymentId,
      order_id,
      amount,
      currency: currency || 'INR',
      method,
      vpa,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    res.status(201).json(response);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const capturePayment = async (req, res) => {
  const { paymentId } = req.params;
  const { amount } = req.body; // In a real app, you'd validate this matches

  try {
    // Check if payment exists and is successful
    const result = await db.query(
        'SELECT * FROM payments WHERE id = $1 AND merchant_id = $2', 
        [paymentId, req.merchant.id]
    );
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'Payment not found' });
    
    const payment = result.rows[0];

    if (payment.status !== 'success') {
       return res.status(400).json({ 
           error: { code: "BAD_REQUEST_ERROR", description: "Payment not in capturable state" } 
       });
    }

    await db.query('UPDATE payments SET captured = true, updated_at = NOW() WHERE id = $1', [paymentId]);

    res.status(200).json({
      ...payment,
      captured: true,
      updated_at: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { createPayment, capturePayment };