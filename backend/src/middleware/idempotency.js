// backend/src/middleware/idempotency.js
const db = require('../config/db');

const idempotency = async (req, res, next) => {
  const key = req.headers['idempotency-key'];
  if (!key) return next();

  const merchantId = req.merchant.id;

  try {
    // 1. Check for existing key
    const result = await db.query(
      'SELECT * FROM idempotency_keys WHERE key = $1 AND merchant_id = $2',
      [key, merchantId]
    );

    if (result.rows.length > 0) {
      const record = result.rows[0];
      // Check expiry
      if (new Date() > new Date(record.expires_at)) {
        // Expired: delete and proceed
        await db.query('DELETE FROM idempotency_keys WHERE key = $1', [key]);
      } else {
        // Valid: return cached response
        console.log(`[Idempotency] Hit: ${key}`);
        return res.status(201).json(record.response);
      }
    }

    // 2. Monkey-patch res.json to cache the response before sending
    const originalJson = res.json;
    res.json = function (body) {
      // Only cache successful creation (201)
      if (res.statusCode === 201) {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
        db.query(
          `INSERT INTO idempotency_keys (key, merchant_id, response, expires_at)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (key, merchant_id) DO NOTHING`,
          [key, merchantId, JSON.stringify(body), expiresAt]
        ).catch(err => console.error('Idempotency Save Error:', err));
      }
      return originalJson.call(this, body);
    };

    next();
  } catch (err) {
    console.error(err);
    next();
  }
};

module.exports = idempotency;