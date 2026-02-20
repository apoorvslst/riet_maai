const express = require('express');
const router = express.Router();
const VoiceResponse = require('twilio').twiml.VoiceResponse;
const HealthLog = require('../models/HealthLog');

// POST /api/voice/webhook
// Twilio calls this URL when the outbound call is answered.
// It plays a Hindi greeting and gathers a keypad digit.
router.post('/webhook', (req, res) => {
    const twiml = new VoiceResponse();

    const gather = twiml.gather({
        numDigits: 1,
        action: '/api/voice/process',
        method: 'POST',
        timeout: 10
    });

    gather.say(
        { language: 'hi-IN', voice: 'Polly.Aditi' },
        'Namaste! Yeh Janani Suraksha se hai. Kya aapne aaj shishu ki harkat mehsoos ki? Haan ke liye 1 dabayein, Naa ke liye 2 dabayein.'
    );

    // If the caller doesn't press anything, repeat the prompt
    twiml.redirect('/api/voice/webhook');

    res.type('text/xml');
    res.send(twiml.toString());
});

// POST /api/voice/process
// Twilio calls this URL after the caller presses a digit.
// It saves the response to MongoDB and thanks the caller.
router.post('/process', async (req, res) => {
    const twiml = new VoiceResponse();

    try {
        const digit = req.body.Digits;
        const callerPhone = req.body.From || 'unknown';

        let status;
        if (digit === '1') {
            status = 'Yes';
        } else if (digit === '2') {
            status = 'No';
        } else {
            status = 'Invalid';
        }

        // Save to MongoDB
        await HealthLog.create({
            phone_number: callerPhone,
            fetal_movement_status: status
        });

        console.log(`✅ Logged: ${callerPhone} → ${status}`);

        if (status === 'Invalid') {
            twiml.say(
                { language: 'hi-IN', voice: 'Polly.Aditi' },
                'Aapne galat button dabaya. Kripya dobara try karein.'
            );
            twiml.redirect('/api/voice/webhook');
        } else {
            twiml.say(
                { language: 'hi-IN', voice: 'Polly.Aditi' },
                'Dhanyavaad! Aapka jawab record kar liya gaya hai. Apna khayal rakhein.'
            );
        }
    } catch (error) {
        console.error('❌ Error processing voice response:', error);
        twiml.say(
            { language: 'hi-IN', voice: 'Polly.Aditi' },
            'Maaf kijiye, kuch galat ho gaya. Kripya baad mein try karein.'
        );
    }

    res.type('text/xml');
    res.send(twiml.toString());
});

module.exports = router;
