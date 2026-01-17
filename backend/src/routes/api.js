// backend/src/routes/api.js
const express = require('express');
const router = express.Router();

// Middleware
const authenticate = require('../middleware/auth');
const idempotency = require('../middleware/idempotency');

// Controllers
const paymentController = require('../controllers/paymentController');
const refundController = require('../controllers/refundController');
const webhookController = require('../controllers/webhookController');
const jobController = require('../controllers/jobController');

// --- Routes ---

// 1. Payments
// Idempotency only applies to creation
router.post('/payments', authenticate, idempotency, paymentController.createPayment);
router.post('/payments/:paymentId/capture', authenticate, paymentController.capturePayment);

// 2. Refunds
router.post('/payments/:paymentId/refunds', authenticate, refundController.createRefund);
router.get('/refunds/:refundId', authenticate, refundController.getRefund);

// 3. Webhooks (Dashboard)
router.get('/webhooks', authenticate, webhookController.listWebhookLogs);
router.post('/webhooks/:webhookId/retry', authenticate, webhookController.retryWebhook);
router.put('/webhooks/settings', authenticate, webhookController.updateSettings);

// 4. Test/System (No Auth required for evaluation)
router.get('/test/jobs/status', jobController.getJobStatus);

module.exports = router;