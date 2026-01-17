// backend/src/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json()); // Essential for parsing JSON bodies

// Mount Routes
app.use('/api/v1', apiRoutes);

// Health Check
app.get('/health', (req, res) => res.send('OK'));

// Start Server
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});