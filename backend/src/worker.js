// backend/src/worker.js
require('dotenv').config();
const db = require('./config/db');

console.log('Starting Worker Service...');

// Import workers to start them
require('./workers/paymentWorker');
require('./workers/refundWorker');
require('./workers/webhookWorker');

console.log('Workers are listening for jobs...');

// Keep process alive
process.on('SIGTERM', async () => {
  console.log('Shutting down workers...');
  await db.pool.end();
  process.exit(0);
});