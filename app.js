// app.js
const express = require('express');
const connectDB = require('./config/db');
const campaignsRouter = require('./routes/campaigns');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to database
connectDB();

// Middleware
app.use(express.json());
app.use('/api/campaigns', campaignsRouter);


// Default route
app.get('/', (req, res) => {
  res.send('Email Campaign Backend');
});


// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});