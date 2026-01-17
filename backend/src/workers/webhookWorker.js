// backend/src/workers/webhookWorker.js
const { Worker, Queue } = require('bullmq');
const connection = require('../config/redis');
const db = require('../config/db');
const crypto = require('crypto');

const webhookQueue = new Queue('webhook-queue', { connection });

// Retry Schedules (in seconds)
// Attempt 1 is immediate. These are delays for subsequent attempts.
const RETRIES_PROD = [60, 300, 1800, 7200]; // 1m, 5m, 30m, 2h
const RETRIES_TEST = [5, 10, 15, 20];       // 5s, 10s, 15s, 20s

const getDelayForAttempt = (attempt) => {
  const isTest = process.env.WEBHOOK_RETRY_INTERVALS_TEST === 'true';
  const schedule = isTest ? RETRIES_TEST : RETRIES_PROD;
  // attempt 1 has happened, so we want index 0 for the delay before attempt 2
  return schedule[attempt - 1] * 1000 || 0; 
};

const processWebhook = async (job) => {
  const { webhookLogId, merchantId, payload } = job.data;
  console.log(`[WebhookWorker] Processing log: ${webhookLogId}`);

  try {
    // 1. Fetch Merchant & Log Details
    const merchantRes = await db.query('SELECT webhook_url, webhook_secret FROM merchants WHERE id = $1', [merchantId]);
    const merchant = merchantRes.rows[0];

    // Check current attempts from DB to ensure consistency
    const logRes = await db.query('SELECT attempts FROM webhook_logs WHERE id = $1', [webhookLogId]);
    if (!logRes.rows[0]) throw new Error('Webhook log not found');
    
    let currentAttempts = logRes.rows[0].attempts + 1;
    
    // If no URL, we can't deliver, but we mark it as "no_url" or just ignore. 
    // Instructions say: "If NULL, skip webhook delivery" but we should update log.
    if (!merchant.webhook_url) {
        await db.query("UPDATE webhook_logs SET status = 'failed', response_body = 'No Webhook URL configured' WHERE id = $1", [webhookLogId]);
        return;
    }

    // 2. Generate Signature
    // IMPORTANT: Payload must be stringified exactly as sent
    const payloadString = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', merchant.webhook_secret || '')
      .update(payloadString)
      .digest('hex');

    // 3. Send Request
    console.log(`[WebhookWorker] Sending to ${merchant.webhook_url} (Attempt ${currentAttempts})`);
    
    const response = await fetch(merchant.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature
      },
      body: payloadString,
      signal: AbortSignal.timeout(5000) // 5s timeout
    });

    const responseBody = await response.text();
    const isSuccess = response.ok;

    // 4. Update Log
    await db.query(
      `UPDATE webhook_logs 
       SET attempts = $1, 
           last_attempt_at = NOW(), 
           response_code = $2, 
           response_body = $3, 
           status = $4 
       WHERE id = $5`,
      [currentAttempts, response.status, responseBody.substring(0, 1000), isSuccess ? 'success' : 'pending', webhookLogId]
    );

    if (isSuccess) {
      console.log(`[WebhookWorker] Success: ${webhookLogId}`);
    } else {
      throw new Error(`HTTP ${response.status}`);
    }

  } catch (error) {
    console.error(`[WebhookWorker] Failed: ${error.message}`);

    // Handle Retry Logic
    // Fetch current attempts again to be safe
    const logRes = await db.query('SELECT attempts FROM webhook_logs WHERE id = $1', [webhookLogId]);
    const attempts = logRes.rows[0].attempts; // This should be the updated count

    if (attempts < 5) {
      const delay = getDelayForAttempt(attempts);
      const nextRetry = new Date(Date.now() + delay);

      // Update DB with next retry time
      await db.query('UPDATE webhook_logs SET next_retry_at = $1 WHERE id = $2', [nextRetry, webhookLogId]);

      // Schedule next job
      await webhookQueue.add('deliver-webhook', job.data, { delay });
      console.log(`[WebhookWorker] Scheduled retry ${attempts + 1} in ${delay}ms`);
    } else {
      // Mark permanently failed
      await db.query("UPDATE webhook_logs SET status = 'failed' WHERE id = $1", [webhookLogId]);
      console.log(`[WebhookWorker] Max retries reached for ${webhookLogId}`);
    }
  }
};

const webhookWorker = new Worker('webhook-queue', processWebhook, { connection });

module.exports = webhookWorker; 