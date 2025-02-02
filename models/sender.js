// models/sender.js
const mongoose = require('mongoose');

const senderSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  dailyLimit: { type: Number, default: 100 },  // Emails per day
  sentToday: { type: Number, default: 0} // Number of emails sent today
});

module.exports = mongoose.model('Sender', senderSchema);