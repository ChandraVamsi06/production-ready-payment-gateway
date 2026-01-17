const db = require('../config/db');
const { addWebhookJob } = require('../jobs/queues');
const crypto = require('crypto');

// --- NEW FUNCTION ADDED ---
const updateSettings = async (req, res) => {
  const { webhookUrl, webhookSecret } = req.body;
  const merchantId = req.merchant.id;

  try {
    await db.query(
      'UPDATE merchants SET webhook_url = $1, webhook_secret = $2 WHERE id = $3',
      [webhookUrl, webhookSecret, merchantId]
    );
    res.json({ success: true, message: 'Webhook settings updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const listWebhookLogs = async (req, res) => {
  const { limit = 10, offset = 0 } = req.query;
  const merchantId = req.merchant.id;

  try {
    // Get Logs
    const result = await db.query(
      `SELECT * FROM webhook_logs WHERE merchant_id = $1 
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [merchantId, limit, offset]
    );

    // Get Total Count
    const countRes = await db.query(
      'SELECT COUNT(*) FROM webhook_logs WHERE merchant_id = $1',
      [merchantId]
    );
    
    // Get Current Settings (So the UI shows the saved URL)
    const merchantRes = await db.query(
      'SELECT webhook_url, webhook_secret FROM merchants WHERE id = $1',
      [merchantId]
    );

    res.json({
      data: result.rows,
      total: parseInt(countRes.rows[0].count),
      config: merchantRes.rows[0], // Send current config to frontend
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const retryWebhook = async (req, res) => {
  const { webhookId } = req.params;
  
  try {
    // Reset attempts and status
    const result = await db.query(
      `UPDATE webhook_logs 
       SET status = 'pending', attempts = 0, next_retry_at = NULL 
       WHERE id = $1 RETURNING *`,
      [webhookId]
    );

    if (!result.rows.length) return res.status(404).json({ error: 'Log not found' });
    
    const log = result.rows[0];

    // Re-queue immediately
    await addWebhookJob({
      webhookLogId: log.id,
      merchantId: log.merchant_id,
      payload: log.payload
    });

    res.json({
      id: log.id,
      status: 'pending',
      message: 'Webhook retry scheduled'
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { listWebhookLogs, retryWebhook, updateSettings };