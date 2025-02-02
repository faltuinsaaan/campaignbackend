// routes/campaigns.js
const express = require('express');
const router = express.Router();
const Campaign = require('../models/campaign');
const Sender = require('../models/sender');
const { sendEmail } = require('../utils/emailSender');
const schedule = require('node-schedule');
const moment = require('moment');

// Function to find available sender based on daily limit
async function findAvailableSender(campaign) {
  for (const senderId of campaign.senders) {
    const sender = await Sender.findById(senderId);
      if (sender && sender.sentToday < sender.dailyLimit) {
        return sender; // Returns sender object if available
    }
  }
    return null; // Return null if no sender available.
}

// Reset sentToday counter for senders
async function resetDailySenderCounter() {
    await Sender.updateMany({}, { sentToday: 0 });
    console.log("Daily senders counter has been reset.")
}

// Reset sentToday counter for campaign
async function resetDailyCampaignCounter() {
    await Campaign.updateMany({}, { sentToday: 0 });
    console.log("Daily campaign counter has been reset.")
}

// Function to convert times to numerical value to be used for scheduling
function parseTime(timeString) {
    const [time, ampm] = timeString.trim().split(" ");
    let [hours, minutes] = time.split(":").map(Number);
    if (ampm.toLowerCase() === "pm" && hours !== 12) hours += 12;
    if (ampm.toLowerCase() === "am" && hours === 12) hours = 0;
    return { hours, minutes };
}


// Function to run scheduled job for email campaign
async function scheduleCampaign(campaign) {
  const { sendDate, startTime, endTime, sendingDelay, message } = campaign;

  const { hours: startHours, minutes: startMinutes } = parseTime(startTime);
  const { hours: endHours, minutes: endMinutes } = parseTime(endTime);

  const startDate = new Date(sendDate);
  startDate.setHours(startHours, startMinutes, 0, 0);

  const endDate = new Date(sendDate);
  endDate.setHours(endHours, endMinutes, 0, 0);

  const job = schedule.scheduleJob({ start: startDate, end: endDate, rule: `*/${sendingDelay} * * * *` }, async () => {
      try {
        if(campaign.status === 'completed') {
          job.cancel();
          return;
        }
        if(campaign.sentToday >= campaign.dailyLimit) {
            campaign.status = 'completed';
            await campaign.save();
          console.log(`Campaign ${campaign.name} has reached its daily send limit.`);
          job.cancel();
          return;
        }
        const sender = await findAvailableSender(campaign);
         if(!sender) {
             console.log(`No sender available for campaign ${campaign.name}, retrying later.`)
             return;
        }

        const recipients = ['recipient1@example.com', 'recipient2@example.com', 'recipient3@example.com']; // Dummy recipients

        for(const recipient of recipients) {
          if (campaign.sentToday >= campaign.dailyLimit || sender.sentToday >= sender.dailyLimit) {
            console.log(`Campaign ${campaign.name} or sender ${sender.email} reached daily limit`);
            break;
          }

          // Use await for sendEmail for sequential processing
            await sendEmail(sender.email, recipient, message);
            // Update sent counters
            sender.sentToday += 1;
            campaign.sentToday += 1;
            await sender.save();
            await campaign.save();

            console.log(`Email sent from ${sender.email} to ${recipient}. Campaign sent count: ${campaign.sentToday}. Sender sent count: ${sender.sentToday}`);
          }
      } catch (error) {
         console.error(`Error in scheduling campaign ${campaign.name}:`, error);
      }
    });
  console.log(`Campaign '${campaign.name}' scheduled to run from ${startDate} to ${endDate} at ${sendingDelay} second intervals.`);
}

// Reset daily counters for campaigns and senders
schedule.scheduleJob({ hour: 0, minute: 0 }, async () => {
  await resetDailySenderCounter();
  await resetDailyCampaignCounter();
});

// GET all campaigns
router.get('/', async (req, res) => {
  try {
    const campaigns = await Campaign.find().populate('senders', 'email name');
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET a single campaign by ID
router.get('/:id', async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id).populate('senders', 'email name');
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }
        res.json(campaign);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST a new campaign
router.post('/', async (req, res) => {
  const { name, sendDate, startTime, endTime, sendingDelay, message, senderIds, dailyLimit } = req.body;
    try {
        // Validate date and time
        const parsedStartTime = parseTime(startTime)
        const parsedEndTime = parseTime(endTime)
        const sendDateTime = new Date(sendDate)
        if(isNaN(sendDateTime) || parsedStartTime.hours === undefined || parsedEndTime.hours === undefined) {
            return res.status(400).json({ message: 'Invalid Date or time provided.'})
        }
        const campaign = new Campaign({
          name,
          sendDate: sendDateTime,
          startTime,
          endTime,
          sendingDelay,
          message,
          senders: senderIds,
            dailyLimit: dailyLimit ? dailyLimit : 1000
      });
      const newCampaign = await campaign.save();
      await scheduleCampaign(newCampaign);
      res.status(201).json(newCampaign);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT/update an existing campaign
router.put('/:id', async (req, res) => {
  try {
    const { sendDate, startTime, endTime, sendingDelay, message, senderIds, dailyLimit} = req.body;
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

      // If any value is provided, use that in the update
    if (sendDate) {
        const sendDateTime = new Date(sendDate)
        if(isNaN(sendDateTime)) return res.status(400).json({message: "Invalid date supplied."});
       campaign.sendDate = sendDateTime;
    }
    if (startTime) campaign.startTime = startTime;
    if (endTime) campaign.endTime = endTime;
    if (sendingDelay) campaign.sendingDelay = sendingDelay;
    if (message) campaign.message = message;
    if(senderIds) campaign.senders = senderIds;
      if(dailyLimit) campaign.dailyLimit = dailyLimit;


      // If the campaign is set to completed, don't update the status
      if(campaign.status !== 'completed' ) campaign.status = 'scheduled';
      const updatedCampaign = await campaign.save();

      await scheduleCampaign(updatedCampaign);
        res.json(updatedCampaign);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE a campaign
router.delete('/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findByIdAndDelete(req.params.id);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    res.json({ message: 'Campaign deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;