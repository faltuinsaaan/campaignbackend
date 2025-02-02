// models/campaign.js
const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sendDate: { type: Date, required: true },
  startTime: { type: String, required: true },  // e.g., "04:15 AM"
  endTime: { type: String, required: true },    // e.g., "07:15 AM"
  sendingDelay: { type: Number, required: true }, // Delay in seconds
  message: { type: String, required: true },
  senders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Sender' }], // Array of senders
  dailyLimit: { type: Number, default: 1000 }, // Total emails per day for campaign
  sentToday: { type: Number, default: 0 }, // Number of emails sent today
  status: { type: String, enum: ['scheduled', 'running', 'completed'], default: 'scheduled' } // Add status to track the campaign lifecycle
});

module.exports = mongoose.model('Campaign', campaignSchema);