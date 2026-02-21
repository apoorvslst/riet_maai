const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const VoiceResponse = twilio.twiml.VoiceResponse;
const MessagingResponse = twilio.twiml.MessagingResponse;

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER;
const WEBHOOK_BASE_URL = process.env.WEBHOOK_BASE_URL || 'https://riet-maai.onrender.com';

// POST /api/inbound/sms
// Triggered when someone sends an SMS to the Twilio number.
// Replies with a TwiML message and initiates an outbound IVR call to the sender.
router.post('/sms', async (req, res) => {
    const senderPhone = req.body.From;
    console.log(`📩 Incoming SMS from: ${senderPhone}`);

    // Initiate an outbound IVR call to the sender
    try {
        const client = twilio(ACCOUNT_SID, AUTH_TOKEN);
        const call = await client.calls.create({
            to: senderPhone,
            from: TWILIO_PHONE,
            url: `${WEBHOOK_BASE_URL}/api/voice/webhook`,
            method: 'POST'
        });
        console.log(`📞 IVR call triggered to ${senderPhone} | SID: ${call.sid}`);
    } catch (error) {
        console.error('❌ Failed to trigger IVR call from SMS:', error.message);
    }

    // Reply to the SMS
    const twiml = new MessagingResponse();
    twiml.message('Namaste! Janani se aapko ek call aa raha hai.');

    res.type('text/xml');
    res.send(twiml.toString());
});

// POST /api/inbound/call
// Triggered when someone calls the Twilio number.
// Plays a short message, hangs up, then triggers the IVR outbound call back.
router.post('/call', async (req, res) => {
    const callerPhone = req.body.From;
    console.log(`📞 Incoming call from: ${callerPhone}`);

    // Respond with a message and hang up
    const twiml = new VoiceResponse();
    twiml.say(
        { language: 'hi-IN', voice: 'Polly.Aditi' },
        'Aapka missed call mil gaya hai.'
    );
    twiml.hangup();

    res.type('text/xml');
    res.send(twiml.toString());

    // After responding, trigger the IVR outbound call back to the caller
    try {
        const client = twilio(ACCOUNT_SID, AUTH_TOKEN);
        const call = await client.calls.create({
            to: callerPhone,
            from: TWILIO_PHONE,
            url: `${WEBHOOK_BASE_URL}/api/voice/webhook`,
            method: 'POST'
        });
        console.log(`📞 IVR callback triggered to ${callerPhone} | SID: ${call.sid}`);
    } catch (error) {
        console.error('❌ Failed to trigger IVR callback:', error.message);
    }
});

module.exports = router;
