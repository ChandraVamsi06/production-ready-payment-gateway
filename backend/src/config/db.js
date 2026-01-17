// backend/src/config/db.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Helper to run queries
const query = (text, params) => pool.query(text, params);

module.exports = {
  query,
  pool,
};