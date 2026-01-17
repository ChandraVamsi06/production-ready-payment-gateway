// backend/src/controllers/jobController.js
const { paymentQueue, webhookQueue, refundQueue } = require('../jobs/queues');

const getJobStatus = async (req, res) => {
  try {
    // Aggregate stats from all queues
    const queues = [paymentQueue, webhookQueue, refundQueue];
    let pending = 0, processing = 0, completed = 0, failed = 0;

    for (const q of queues) {
      const counts = await q.getJobCounts('wait', 'active', 'completed', 'failed');
      pending += counts.wait;
      processing += counts.active;
      completed += counts.completed;
      failed += counts.failed;
    }

    res.json({
      pending,
      processing,
      completed,
      failed,
      worker_status: 'running' // Simulating status check
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getJobStatus };