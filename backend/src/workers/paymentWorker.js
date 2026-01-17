// backend/src/workers/paymentWorker.js
const { Worker } = require('bullmq');
const connection = require('../config/redis');
const db = require('../config/db');
const { addWebhookJob } = require('../jobs/queues');

const processPayment = async (job) => {
  const { paymentId } = job.data;
  console.log(`[PaymentWorker] Processing payment: ${paymentId}`);

  try {
    // 1. Fetch payment
    const res = await db.query('SELECT * FROM payments WHERE id = $1', [paymentId]);
    const payment = res.rows[0];
    if (!payment) throw new Error('Payment not found');

    // 2. Simulate Delay
    // Test mode: 1000ms, Prod: 5-10 seconds
    const isTest = process.env.TEST_MODE === 'true';
    const delay = isTest ? 1000 : Math.floor(Math.random() * 5000) + 5000;
    await new Promise(r => setTimeout(r, delay));

    // 3. Determine Outcome
    // Test mode: Always success, Prod: UPI 90%, Card 95%
    let success = true;
    if (!isTest) {
        const rand = Math.random();
        if (payment.method === 'upi') success = rand < 0.90;
        else if (payment.method === 'card') success = rand < 0.95;
    }

    const status = success ? 'success' : 'failed';
    const errorCode = success ? null : 'PAYMENT_FAILED';
    const errorDesc = success ? null : 'Bank rejected transaction';

    // 4. Update Database
    await db.query(
      `UPDATE payments SET status = $1, error_code = $2, error_description = $3, updated_at = NOW() 
       WHERE id = $4`,
      [status, errorCode, errorDesc, paymentId]
    );

    // 5. Trigger Webhook
    const eventType = success ? 'payment.success' : 'payment.failed';
    
    // Create Webhook Log entry first
    const payload = {
      event: eventType,
      timestamp: Math.floor(Date.now() / 1000),
      data: { payment: { ...payment, status } } // Update status in payload
    };

    const logRes = await db.query(
      `INSERT INTO webhook_logs (merchant_id, event, payload, status)
       VALUES ($1, $2, $3, 'pending') RETURNING id`,
      [payment.merchant_id, eventType, JSON.stringify(payload)]
    );

    // Add to Webhook Queue
    await addWebhookJob({
      webhookLogId: logRes.rows[0].id,
      merchantId: payment.merchant_id,
      payload
    });

    console.log(`[PaymentWorker] Finished ${paymentId}: ${status}`);

  } catch (error) {
    console.error(`[PaymentWorker] Error: ${error.message}`);
    throw error;
  }
};

const paymentWorker = new Worker('payment-queue', processPayment, { connection });

module.exports = paymentWorker;