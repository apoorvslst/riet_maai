const cron = require('node-cron');
const axios = require('axios');
const HealthLog = require('../models/HealthLog');

const GROQ_API_KEY = process.env.GROQ_API_KEY;

/**
 * Generate a summary for a user's interactions within a given time range.
 * Uses Groq Llama 3 to analyze the symptom/medication timeline.
 */
async function generateSummary(user, periodStart, periodEnd, summaryType) {
    // Filter interactions within the time range
    const interactions = user.history.filter(h => {
        const t = new Date(h.timestamp);
        return t >= periodStart && t <= periodEnd;
    });

    if (interactions.length === 0) {
        console.log(`📋 No interactions for ${user.phone_number} in ${summaryType} period. Skipping.`);
        return null;
    }

    // Build a timeline text for the LLM
    const timelineEntries = interactions.map((h, i) => {
        const time = new Date(h.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        const symptoms = h.symptoms.map(s => `${s.name} (${s.status}${s.reported_time ? ', ' + s.reported_time : ''})`).join(', ') || 'None';
        const meds = h.medications.map(m => `${m.name} (${m.taken ? 'taken' : 'not taken'}${m.taken_time ? ' at ' + m.taken_time : ''}${m.effect_noted ? ', effect: ' + m.effect_noted : ''})`).join(', ') || 'None';
        const relief = h.relief_noted ? `Yes — ${h.relief_details}` : 'No';

        return `--- Call ${i + 1} at ${time} ---
Patient said (English): ${h.user_message_english}
Symptoms: ${symptoms}
Medications: ${meds}
Relief noted: ${relief}
Severity: ${h.severity_score}/10
AI Summary: ${h.ai_summary}`;
    });

    const avgSeverity = interactions.reduce((sum, h) => sum + (h.severity_score || 0), 0) / interactions.length;

    const prompt = `You are a maternal health doctor's assistant. Create a ${summaryType} health summary for a patient.

PATIENT PHONE: ${user.phone_number}
PERIOD: ${periodStart.toLocaleDateString('en-IN')} to ${periodEnd.toLocaleDateString('en-IN')}
TOTAL INTERACTIONS: ${interactions.length}
AVERAGE SEVERITY: ${avgSeverity.toFixed(1)}/10

INTERACTION TIMELINE:
${timelineEntries.join('\n\n')}

Generate a comprehensive summary with these sections:
1. OVERVIEW: Brief status of the patient's health during this period
2. SYMPTOMS TIMELINE: Track when each symptom started, persisted, or was relieved
3. MEDICATIONS: What was taken, when, and the effects noted
4. RELIEF/CURE TRACKING: If any symptoms were cured through medication, note the journey (symptom start → medication → cure)
5. DOCTOR NOTES: Key items a doctor should review, any red flags

Return ONLY valid JSON:
{
  "summary_english": "Complete summary in English for doctor review",
  "summary_native": "Complete summary in Hindi for patient",
  "symptoms_timeline": "Symptom progression: symptom started on X → persisted/relieved → cured by Y",
  "medications_timeline": "Medication adherence and effects",
  "doctor_notes": "Key items for doctor review, red flags, recommendations"
}`;

    try {
        const response = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: prompt },
                    { role: 'user', content: `Generate the ${summaryType} summary now.` }
                ],
                temperature: 0.3,
                max_tokens: 2048,
                response_format: { type: 'json_object' }
            },
            {
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        const result = JSON.parse(response.data.choices[0].message.content);

        const summaryEntry = {
            type: summaryType,
            period_start: periodStart,
            period_end: periodEnd,
            generated_at: new Date(),
            summary_english: result.summary_english || '',
            summary_native: result.summary_native || '',
            total_interactions: interactions.length,
            symptoms_timeline: result.symptoms_timeline || '',
            medications_timeline: result.medications_timeline || '',
            avg_severity: parseFloat(avgSeverity.toFixed(1)),
            doctor_notes: result.doctor_notes || ''
        };

        // Push summary to user's document
        await HealthLog.findOneAndUpdate(
            { phone_number: user.phone_number },
            { $push: { summaries: summaryEntry }, $set: { updated_at: new Date() } }
        );

        console.log(`✅ ${summaryType.toUpperCase()} summary saved for ${user.phone_number}`);
        return summaryEntry;

    } catch (error) {
        console.error(`❌ Summary generation failed for ${user.phone_number}:`, error.message);
        return null;
    }
}


/**
 * Run summary generation for all users with interactions in the period.
 */
async function runSummaryJob(summaryType) {
    const now = new Date();
    let periodStart, periodEnd;

    if (summaryType === 'daily') {
        // Today: 00:00 to 23:59 IST
        periodStart = new Date(now);
        periodStart.setHours(0, 0, 0, 0);
        periodEnd = new Date(now);
        periodEnd.setHours(23, 59, 59, 999);
    } else if (summaryType === 'weekly') {
        // Last 7 days
        periodEnd = new Date(now);
        periodStart = new Date(now);
        periodStart.setDate(periodStart.getDate() - 7);
        periodStart.setHours(0, 0, 0, 0);
    } else if (summaryType === 'monthly') {
        // Previous month
        periodEnd = new Date(now);
        periodEnd.setDate(0); // last day of previous month
        periodEnd.setHours(23, 59, 59, 999);
        periodStart = new Date(periodEnd);
        periodStart.setDate(1);
        periodStart.setHours(0, 0, 0, 0);
    }

    console.log(`\n📋 ═══════════════════════════════════════════`);
    console.log(`📋 Running ${summaryType.toUpperCase()} Summary Job`);
    console.log(`📋 Period: ${periodStart.toLocaleString('en-IN')} → ${periodEnd.toLocaleString('en-IN')}`);
    console.log(`📋 ═══════════════════════════════════════════\n`);

    try {
        // Find all users who have interactions in this period
        const users = await HealthLog.find({
            'history.timestamp': { $gte: periodStart, $lte: periodEnd }
        });

        console.log(`📋 Found ${users.length} users with interactions in this period.`);

        for (const user of users) {
            await generateSummary(user, periodStart, periodEnd, summaryType);
        }

        console.log(`📋 ${summaryType.toUpperCase()} summary job completed for ${users.length} users.\n`);
    } catch (error) {
        console.error(`❌ ${summaryType} summary job error:`, error.message);
    }
}


/**
 * Initialize all cron schedules.
 * - Daily summary:  every day at 9:00 PM IST
 * - Weekly summary:  every Sunday at 9:00 PM IST
 * - Monthly summary: 1st of every month at 12:00 AM IST
 */
function initSummaryCron() {
    // ─── Daily Summary at 9:00 PM IST ───────────────────────────────────
    // Cron: minute hour * * * (0 21 = 9 PM)
    cron.schedule('0 21 * * *', () => {
        console.log('⏰ Daily summary cron triggered (9:00 PM IST)');
        runSummaryJob('daily');
    }, {
        timezone: 'Asia/Kolkata'
    });

    // ─── Weekly Summary on Sunday at 9:00 PM IST ────────────────────────
    // Cron: 0 21 * * 0 (Sunday = 0)
    cron.schedule('0 21 * * 0', () => {
        console.log('⏰ Weekly summary cron triggered (Sunday 9:00 PM IST)');
        runSummaryJob('weekly');
    }, {
        timezone: 'Asia/Kolkata'
    });

    // ─── Monthly Summary on 1st of month at 12:00 AM IST ────────────────
    // Cron: 0 0 1 * * (1st day, midnight)
    cron.schedule('0 0 1 * *', () => {
        console.log('⏰ Monthly summary cron triggered (1st of month)');
        runSummaryJob('monthly');
    }, {
        timezone: 'Asia/Kolkata'
    });

    console.log('⏰ Summary cron jobs initialized:');
    console.log('   📋 Daily   → 9:00 PM IST every day');
    console.log('   📋 Weekly  → 9:00 PM IST every Sunday');
    console.log('   📋 Monthly → 12:00 AM IST on 1st of each month');
}


module.exports = { initSummaryCron, runSummaryJob };
