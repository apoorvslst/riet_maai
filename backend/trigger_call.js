/**
 * trigger_call.js
 * ---------------
 * Run this script to initiate an outbound Twilio Voice call.
 *
 * Usage:
 *   node trigger_call.js
 *
 * Prerequisites:
 *   1. Fill in your Twilio credentials in the .env file.
 *   2. Expose your local server via ngrok:  ngrok http 5000
 *   3. Update WEBHOOK_BASE_URL below with your ngrok https URL.
 */

require('dotenv').config();
const twilio = require('twilio');

// ─── Configuration ──────────────────────────────────────────
const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER;
const TARGET_PHONE = process.env.MY_PHONE_NUMBER;

// 🔴 IMPORTANT: Replace this with your actual ngrok URL before running
const WEBHOOK_BASE_URL = 'https://photomechanically-unmustered-sharyn.ngrok-free.dev';

// ─── Make the Call ──────────────────────────────────────────
const client = twilio(ACCOUNT_SID, AUTH_TOKEN);

async function makeCall() {
    try {
        const call = await client.calls.create({
            to: TARGET_PHONE,
            from: TWILIO_PHONE,
            url: `${WEBHOOK_BASE_URL}/api/voice/webhook`,
            method: 'POST'
        });

        console.log('📞 Call initiated successfully!');
        console.log(`   Call SID: ${call.sid}`);
        console.log(`   To:       ${TARGET_PHONE}`);
        console.log(`   From:     ${TWILIO_PHONE}`);
    } catch (error) {
        console.error('❌ Failed to initiate call:', error.message);
    }
}

makeCall();
