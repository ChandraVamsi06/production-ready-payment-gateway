// backend/src/workers/refundWorker.js
const { Worker } = require('bullmq');
const connection = require('../config/redis');
const db = require('../config/db');
const { addWebhookJob } = require('../jobs/queues');

const processRefund = async (job) => {
  const { refundId } = job.data;
  console.log(`[RefundWorker] Processing refund: ${refundId}`);

  try {
    // 1. Fetch Refund
    const res = await db.query('SELECT * FROM refunds WHERE id = $1', [refundId]);
    const refund = res.rows[0];
    if (!refund) throw new Error('Refund not found');

    // 2. Simulate Delay (3-5s)
    const delay = Math.floor(Math.random() * 2000) + 3000;
    await new Promise(r => setTimeout(r, delay));

    // 3. Update Status
    await db.query(
      `UPDATE refunds SET status = 'processed', processed_at = NOW() WHERE id = $1`,
      [refundId]
    );

    // 4. Trigger Webhook
    const payload = {
      event: 'refund.processed',
      timestamp: Math.floor(Date.now() / 1000),
      data: { refund: { ...refund, status: 'processed' } }
    };

    const logRes = await db.query(
      `INSERT INTO webhook_logs (merchant_id, event, payload, status)
       VALUES ($1, $2, $3, 'pending') RETURNING id`,
      [refund.merchant_id, 'refund.processed', JSON.stringify(payload)]
    );

    await addWebhookJob({
      webhookLogId: logRes.rows[0].id,
      merchantId: refund.merchant_id,
      payload
    });

    console.log(`[RefundWorker] Refund processed: ${refundId}`);

  } catch (error) {
    console.error(`[RefundWorker] Error: ${error.message}`);
    throw error;
  }
};

const refundWorker = new Worker('refund-queue', processRefund, { connection });

module.exports = refundWorker;