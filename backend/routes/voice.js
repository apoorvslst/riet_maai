const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const axios = require('axios');
const FormData = require('form-data');
const VoiceResponse = twilio.twiml.VoiceResponse;
const HealthLog = require('../models/HealthLog');

// Configuration
const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER;
const TARGET_PHONE = process.env.MY_PHONE_NUMBER;
const WEBHOOK_BASE_URL = process.env.WEBHOOK_BASE_URL || 'https://photomechanically-unmustered-sharyn.ngrok-free.dev';

// AI Service Keys
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const SARVAM_API_KEY = process.env.SARVAM_API_KEY;
const HUGGINGFACEHUB_API_TOKEN = process.env.HUGGINGFACEHUB_API_TOKEN;

// RAG Service URL
const RAG_API_URL = process.env.RAG_API_URL || 'http://localhost:8000';

// De-duplication
const processedRecordings = new Set();


// ─── POST /api/voice/trigger ────────────────────────────────────────────────
router.post('/trigger', async (req, res) => {
    try {
        const client = twilio(ACCOUNT_SID, AUTH_TOKEN);
        const call = await client.calls.create({
            to: TARGET_PHONE,
            from: TWILIO_PHONE,
            url: `${WEBHOOK_BASE_URL}/api/voice/webhook`,
            method: 'POST'
        });
        console.log(`📞 Call initiated! SID: ${call.sid}`);
        res.json({ message: 'Call initiated successfully', callSid: call.sid });
    } catch (error) {
        console.error('❌ Failed to initiate call:', error.message);
        res.status(500).json({ message: 'Failed to initiate call', error: error.message });
    }
});


// ─── POST /api/voice/webhook ────────────────────────────────────────────────
router.post('/webhook', (req, res) => {
    const twiml = new VoiceResponse();

    twiml.say(
        { language: 'hi-IN', voice: 'Polly.Aditi' },
        'Namaste. Janani AI Sahayak mein aapka swagat hai. Kripya batayein ki aap aaj kaisa mehsoos kar rahi hain? Apni baat khatam karne ke baad hash dabayein ya phone kaat dein.'
    );

    twiml.record({
        action: '/api/voice/process-ai',
        method: 'POST',
        finishOnKey: '#',
        timeout: 5,
        maxLength: 120,
        playBeep: true,
        transcribe: false,
        recordingStatusCallback: `${WEBHOOK_BASE_URL}/api/voice/process-ai`,
        recordingStatusCallbackMethod: 'POST'
    });

    twiml.say(
        { language: 'hi-IN', voice: 'Polly.Aditi' },
        'Koi awaaz nahi mili. Kripya dobara try karein.'
    );
    twiml.redirect('/api/voice/webhook');

    res.type('text/xml');
    res.send(twiml.toString());
});


// ─── POST /api/voice/process-ai ─────────────────────────────────────────────
// Full pipeline: Transcribe → RAG → Clinical Extraction → Save → Speak
router.post('/process-ai', async (req, res) => {
    const recordingUrl = req.body.RecordingUrl;
    const recordingStatus = req.body.RecordingStatus;
    const callerPhone = req.body.From || req.body.To || 'unknown';

    console.log(`\n🧠 ═══════════════════════════════════════════`);
    console.log(`🧠 /process-ai | From: ${callerPhone}`);
    console.log(`🧠 RecordingUrl: ${recordingUrl}`);
    console.log(`🧠 RecordingStatus: ${recordingStatus || 'action callback'}`);
    console.log(`🧠 ═══════════════════════════════════════════\n`);

    if (recordingStatus && recordingStatus !== 'completed') {
        return res.sendStatus(200);
    }
    if (!recordingUrl) {
        const twiml = new VoiceResponse();
        twiml.say({ language: 'hi-IN', voice: 'Polly.Aditi' }, 'Recording nahi mili. Kripya dobara try karein.');
        res.type('text/xml');
        return res.send(twiml.toString());
    }

    const recordingSid = req.body.RecordingSid || recordingUrl;
    if (processedRecordings.has(recordingSid)) {
        return res.sendStatus(200);
    }
    processedRecordings.add(recordingSid);

    const isStatusCallback = !!recordingStatus;
    const twiml = new VoiceResponse();

    try {
        // ── STEP 1: Download recording ──────────────────────────────────
        console.log('📥 Step 1: Downloading recording...');
        const audioResponse = await axios.get(`${recordingUrl}.wav`, {
            auth: { username: ACCOUNT_SID, password: AUTH_TOKEN },
            responseType: 'arraybuffer',
            timeout: 15000
        });
        const audioBuffer = Buffer.from(audioResponse.data);
        console.log(`📥 Downloaded ${audioBuffer.length} bytes`);

        // ── STEP 2: Transcribe with Groq Whisper ────────────────────────
        console.log('🗣️ Step 2: Transcribing with Groq Whisper...');
        const formData = new FormData();
        formData.append('file', audioBuffer, { filename: 'recording.wav', contentType: 'audio/wav' });
        formData.append('model', 'whisper-large-v3');
        formData.append('language', 'hi');
        formData.append('response_format', 'json');

        const transcriptionResponse = await axios.post(
            'https://api.groq.com/openai/v1/audio/transcriptions',
            formData,
            {
                headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, ...formData.getHeaders() },
                maxContentLength: Infinity, maxBodyLength: Infinity, timeout: 30000
            }
        );
        const rawTranscription = transcriptionResponse.data.text || '';
        console.log(`🗣️ Transcription: "${rawTranscription}"`);

        // ── STEP 3: RAG — bilingual advice ──────────────────────────────
        console.log('📚 Step 3: Querying RAG Service...');
        let ragAdviceNative = '';
        let ragAdviceEnglish = '';
        let userMessageEnglish = '';

        try {
            const ragResponse = await axios.post(
                `${RAG_API_URL}/ask`,
                {
                    query: rawTranscription,
                    language_code: 'hi-IN',
                    patient_data: `Mother called via Janani AI. Phone: ${callerPhone}.`,
                    history: []
                },
                { headers: { 'Content-Type': 'application/json' }, timeout: 45000 }
            );
            ragAdviceNative = ragResponse.data.localized_answer || '';
            ragAdviceEnglish = ragResponse.data.english_answer || '';
            userMessageEnglish = ragResponse.data.english_query || '';
            console.log(`📚 RAG English: "${ragAdviceEnglish.substring(0, 150)}..."`);
        } catch (ragError) {
            console.error('⚠️ RAG error, using Groq fallback:', ragError.message);
        }

        // ── STEP 4: Clinical Extraction — symptoms, medications, relief ──
        console.log('🏥 Step 4: Clinical extraction with Groq Llama 3...');
        const clinicalPrompt = `You are a maternal health clinical data extractor. Analyze this patient's voice transcript carefully.

PATIENT TRANSCRIPT: "${rawTranscription}"
${ragAdviceEnglish ? `MEDICAL CONTEXT: "${ragAdviceEnglish}"` : ''}

Extract ALL of the following and return ONLY valid JSON:
{
  "fetal_movement": "Yes" or "No",
  "severity": 1-10 (1=healthy, 5=needs monitoring, 10=emergency),
  "summary": "brief medical summary in Hindi",

  "symptoms": [
    {
      "name": "symptom name in English (e.g. headache, nausea, swelling, bleeding, fever)",
      "reported_time": "when she experienced it (e.g. morning, afternoon, night, since 2 days) or empty string if not mentioned",
      "status": "active" or "relieved" or "recurring"
    }
  ],

  "medications": [
    {
      "name": "medicine name in English (e.g. iron tablet, paracetamol, folic acid)",
      "taken": true or false,
      "taken_time": "when she took it (e.g. morning, daytime, night) or empty string if not mentioned",
      "effect_noted": "any effect she mentioned (e.g. feeling better, no change, side effect) or empty string"
    }
  ],

  "relief_noted": true or false (did she mention feeling better, cured, or relieved from any symptom?),
  "relief_details": "what relief was mentioned (e.g. 'headache gone after taking medicine') or empty string"
}

RULES:
- If NO symptoms are mentioned, return empty array for symptoms
- If NO medications are mentioned, return empty array for medications
- If she mentions taking medicine but not which one, use "unspecified medicine"
- If she mentions a time of day for medication, record it
- If she says she is feeling better or a symptom went away, set relief_noted=true
- Always detect: headache, nausea, vomiting, fever, swelling, bleeding, pain, cramps, dizziness, fatigue`;

        let clinicalData = {
            fetal_movement: 'No', severity: 5, summary: '',
            symptoms: [], medications: [],
            relief_noted: false, relief_details: ''
        };

        try {
            const analysisResponse = await axios.post(
                'https://api.groq.com/openai/v1/chat/completions',
                {
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        { role: 'system', content: clinicalPrompt },
                        { role: 'user', content: 'Extract the clinical data now.' }
                    ],
                    temperature: 0.2,
                    max_tokens: 1024,
                    response_format: { type: 'json_object' }
                },
                {
                    headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
                    timeout: 25000
                }
            );
            clinicalData = JSON.parse(analysisResponse.data.choices[0].message.content);
            console.log(`🏥 Clinical data extracted:`, JSON.stringify(clinicalData, null, 2));
        } catch (err) {
            console.error('⚠️ Clinical extraction failed:', err.message);
        }

        const fetalStatus = clinicalData.fetal_movement === 'Yes' ? 'Yes' : 'No';
        const severityScore = Number(clinicalData.severity) || 5;
        const summary = clinicalData.summary || 'Summary not available';

        console.log(`🏥 Fetal: ${fetalStatus} | Severity: ${severityScore}/10`);
        console.log(`🏥 Symptoms: ${clinicalData.symptoms.length} | Meds: ${clinicalData.medications.length} | Relief: ${clinicalData.relief_noted}`);

        // ── STEP 5: Save to MongoDB ─────────────────────────────────────
        console.log('💾 Step 5: Saving to user history...');
        const interactionEntry = {
            timestamp: new Date(),
            user_message_native: rawTranscription,
            user_message_english: userMessageEnglish || rawTranscription,
            rag_reply_native: ragAdviceNative || 'Advice unavailable',
            rag_reply_english: ragAdviceEnglish || 'Advice unavailable',
            symptoms: (clinicalData.symptoms || []).map(s => ({
                name: s.name || 'unknown',
                reported_time: s.reported_time || '',
                status: s.status || 'active'
            })),
            medications: (clinicalData.medications || []).map(m => ({
                name: m.name || 'unknown',
                taken: m.taken || false,
                taken_time: m.taken_time || '',
                effect_noted: m.effect_noted || ''
            })),
            relief_noted: clinicalData.relief_noted || false,
            relief_details: clinicalData.relief_details || '',
            fetal_movement_status: fetalStatus,
            severity_score: severityScore,
            ai_summary: summary
        };

        const updatedLog = await HealthLog.findOneAndUpdate(
            { phone_number: callerPhone },
            {
                $push: { history: interactionEntry },
                $set: { updated_at: new Date() },
                $setOnInsert: { created_at: new Date() }
            },
            { upsert: true, new: true }
        );

        const totalInteractions = updatedLog.history.length;
        console.log(`💾 Saved! User: ${callerPhone} | Interaction #${totalInteractions}`);

        // ── STEP 6: Speak personalized response ─────────────────────────
        if (!isStatusCallback) {
            const finalAdvice = ragAdviceNative || summary || 'Kripya apne doctor se milein.';
            let spokenResponse = 'Dhanyavaad. Aapki baat sun li gayi hai. ';

            if (severityScore >= 7) {
                spokenResponse += 'Humne kuch gambhir lakshan pehchane hain. ';
            }
            spokenResponse += finalAdvice;
            if (severityScore >= 7) {
                spokenResponse += ' Kripya turant apne doctor se sampark karein.';
            } else {
                spokenResponse += ' Apna aur apne bachche ka khayal rakhein.';
            }

            twiml.say({ language: 'hi-IN', voice: 'Polly.Aditi' }, spokenResponse);
        }

        console.log(`\n🧠 Pipeline completed! User: ${callerPhone} | Interactions: ${totalInteractions}\n`);

    } catch (error) {
        console.error('❌ Pipeline error:', error.message);
        if (error.response) {
            console.error('❌ API:', error.response.status, JSON.stringify(error.response.data).substring(0, 500));
        }

        if (!isStatusCallback) {
            twiml.say(
                { language: 'hi-IN', voice: 'Polly.Aditi' },
                'Maaf kijiye, abhi humari seva mein kuch dikkat aa rahi hai. Kripya kuch der baad dobara try karein.'
            );
        }

        try {
            await HealthLog.findOneAndUpdate(
                { phone_number: callerPhone },
                {
                    $push: {
                        history: {
                            timestamp: new Date(),
                            user_message_native: `Error: ${error.message}`,
                            user_message_english: `Error: ${error.message}`,
                            fetal_movement_status: 'Invalid',
                            severity_score: 0
                        }
                    },
                    $set: { updated_at: new Date() },
                    $setOnInsert: { created_at: new Date() }
                },
                { upsert: true }
            );
        } catch (dbErr) {
            console.error('❌ Failed to save error log:', dbErr.message);
        }
    }

    if (isStatusCallback) {
        res.sendStatus(200);
    } else {
        res.type('text/xml');
        res.send(twiml.toString());
    }
});


module.exports = router;
