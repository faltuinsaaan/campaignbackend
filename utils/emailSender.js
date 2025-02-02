// utils/emailSender.js
async function sendEmail(senderEmail, recipientEmail, message) {
    // Replace this with actual email sending logic
    // using a service like Nodemailer or SendGrid
    console.log(`Sending email from ${senderEmail} to ${recipientEmail}: ${message}`);
    return true; // Indicate successful send (replace with actual return status)
  }
  
  module.exports = { sendEmail };