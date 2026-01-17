// backend/src/jobs/queues.js
const { Queue } = require('bullmq');
const connection = require('../config/redis');

// Define Queues
const paymentQueue = new Queue('payment-queue', { connection });
const webhookQueue = new Queue('webhook-queue', { connection });
const refundQueue = new Queue('refund-queue', { connection });

// Helper to add jobs
const addPaymentJob = async (data) => {
  return paymentQueue.add('process-payment', data, {
    removeOnComplete: true, // Keep Redis clean
    removeOnFail: false,    // Keep failed jobs for inspection
  });
};

const addWebhookJob = async (data) => {
  // Logic for retry intervals is handled in the worker or by delay options
  // For the initial add, we just add it immediately
  return webhookQueue.add('deliver-webhook', data, {
    removeOnComplete: true,
    removeOnFail: false,
  });
};

const addRefundJob = async (data) => {
  return refundQueue.add('process-refund', data, {
    removeOnComplete: true,
    removeOnFail: false,
  });
};

module.exports = {
  paymentQueue,
  webhookQueue,
  refundQueue,
  addPaymentJob,
  addWebhookJob,
  addRefundJob,
};