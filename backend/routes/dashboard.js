const express = require('express');
const router = express.Router();
const HealthLog = require('../models/HealthLog');

// ─── Helper: find user by phone or email ────────────────────────────────────
async function findUserLog(identifier) {
    // Try phone first, then email
    let log = await HealthLog.findOne({ phone_number: identifier });
    if (!log) {
        log = await HealthLog.findOne({ user_email: identifier });
    }
    return log;
}

// ─── GET /api/dashboard/:identifier ─────────────────────────────────────────
// Returns full dashboard data for a user (symptoms, medications, summaries)
router.get('/:identifier', async (req, res) => {
    try {
        const { identifier } = req.params;
        const log = await findUserLog(identifier);

        if (!log) {
            return res.json({
                found: false,
                message: 'No health records found for this user.',
                data: {
                    symptoms: [],
                    medications: [],
                    recentInteractions: [],
                    summaries: [],
                    stats: { totalInteractions: 0, avgSeverity: 0, reliefRate: 0 }
                }
            });
        }

        const history = log.history || [];

        // ─── Aggregate Symptoms Timeline ────────────────────────────────
        const symptomMap = {};
        history.forEach(interaction => {
            (interaction.symptoms || []).forEach(s => {
                if (!symptomMap[s.name]) {
                    symptomMap[s.name] = {
                        name: s.name,
                        firstReported: interaction.timestamp,
                        lastReported: interaction.timestamp,
                        status: s.status,
                        occurrences: 0,
                        timeline: []
                    };
                }
                symptomMap[s.name].occurrences++;
                symptomMap[s.name].lastReported = interaction.timestamp;
                symptomMap[s.name].status = s.status;
                symptomMap[s.name].timeline.push({
                    date: interaction.timestamp,
                    status: s.status,
                    reportedTime: s.reported_time
                });
            });
        });

        // ─── Aggregate Medications Timeline ─────────────────────────────
        const medMap = {};
        history.forEach(interaction => {
            (interaction.medications || []).forEach(m => {
                if (!medMap[m.name]) {
                    medMap[m.name] = {
                        name: m.name,
                        timesTaken: 0,
                        timesSkipped: 0,
                        lastMentioned: interaction.timestamp,
                        effects: []
                    };
                }
                if (m.taken) medMap[m.name].timesTaken++;
                else medMap[m.name].timesSkipped++;
                medMap[m.name].lastMentioned = interaction.timestamp;
                if (m.effect_noted) medMap[m.name].effects.push(m.effect_noted);
            });
        });

        // ─── Calculate Stats ────────────────────────────────────────────
        const severities = history.filter(h => h.severity_score > 0).map(h => h.severity_score);
        const avgSeverity = severities.length > 0
            ? (severities.reduce((a, b) => a + b, 0) / severities.length).toFixed(1)
            : 0;
        const reliefCount = history.filter(h => h.relief_noted).length;
        const reliefRate = history.length > 0
            ? ((reliefCount / history.length) * 100).toFixed(0)
            : 0;

        // ─── Recent interactions (last 10) ──────────────────────────────
        const recentInteractions = history
            .slice(-10)
            .reverse()
            .map(h => ({
                id: h._id,
                timestamp: h.timestamp,
                userMessage: h.user_message_english || h.user_message_native,
                aiReply: h.rag_reply_english || h.rag_reply_native,
                severity: h.severity_score,
                symptoms: h.symptoms,
                medications: h.medications,
                reliefNoted: h.relief_noted,
                reliefDetails: h.relief_details,
                fetalMovement: h.fetal_movement_status,
                aiSummary: h.ai_summary
            }));

        res.json({
            found: true,
            data: {
                symptoms: Object.values(symptomMap).sort((a, b) => b.occurrences - a.occurrences),
                medications: Object.values(medMap).sort((a, b) => b.timesTaken - a.timesTaken),
                recentInteractions,
                summaries: (log.summaries || []).slice(-5).reverse(),
                stats: {
                    totalInteractions: history.length,
                    avgSeverity: parseFloat(avgSeverity),
                    reliefRate: parseInt(reliefRate),
                    lastActivity: history.length > 0 ? history[history.length - 1].timestamp : null
                }
            }
        });
    } catch (err) {
        console.error('Dashboard fetch error:', err);
        res.status(500).json({ message: 'Failed to fetch dashboard data', error: err.message });
    }
});


// ─── GET /api/dashboard/:identifier/summary/doctor ──────────────────────────
// Generate a doctor-focused summary: red flags, high severity, medical concerns
router.get('/:identifier/summary/doctor', async (req, res) => {
    try {
        const log = await findUserLog(req.params.identifier);
        if (!log || !log.history.length) {
            return res.json({ summary: 'No patient interactions recorded yet.' });
        }

        const history = log.history;

        // High severity events
        const highSeverity = history.filter(h => h.severity_score >= 6);

        // Active symptoms
        const activeSymptoms = [];
        history.slice(-20).forEach(h => {
            (h.symptoms || []).forEach(s => {
                if (s.status === 'active' || s.status === 'recurring') {
                    if (!activeSymptoms.includes(s.name)) activeSymptoms.push(s.name);
                }
            });
        });

        // Fetal movement concerns
        const noFetalMovement = history.filter(h => h.fetal_movement_status === 'No').length;
        const totalChecks = history.filter(h => h.fetal_movement_status !== 'Invalid').length;

        // Medications not taken
        const skippedMeds = [];
        history.slice(-20).forEach(h => {
            (h.medications || []).forEach(m => {
                if (!m.taken && !skippedMeds.includes(m.name)) skippedMeds.push(m.name);
            });
        });

        const summary = {
            generatedAt: new Date().toISOString(),
            totalInteractions: history.length,
            redFlags: [],
            activeSymptoms,
            skippedMedications: skippedMeds,
            fetalMovementConcern: totalChecks > 0 && (noFetalMovement / totalChecks) > 0.5,
            highSeverityEvents: highSeverity.length,
            recentHighSeverity: highSeverity.slice(-5).map(h => ({
                date: h.timestamp,
                severity: h.severity_score,
                summary: h.ai_summary,
                symptoms: h.symptoms?.map(s => s.name) || []
            })),
            doctorNotes: ''
        };

        // Build red flags
        if (highSeverity.length > 3) summary.redFlags.push(`${highSeverity.length} high-severity events recorded`);
        if (activeSymptoms.length > 3) summary.redFlags.push(`Multiple active symptoms: ${activeSymptoms.join(', ')}`);
        if (summary.fetalMovementConcern) summary.redFlags.push('Patient frequently reports no fetal movement');
        if (skippedMeds.length > 0) summary.redFlags.push(`Medications not taken: ${skippedMeds.join(', ')}`);

        // Build doctor notes from recent AI summaries
        const recentSummaries = history.slice(-10)
            .filter(h => h.ai_summary)
            .map(h => `[${new Date(h.timestamp).toLocaleDateString()}] ${h.ai_summary}`);
        summary.doctorNotes = recentSummaries.join('\n');

        res.json({ summary });
    } catch (err) {
        console.error('Doctor summary error:', err);
        res.status(500).json({ message: 'Failed to generate doctor summary', error: err.message });
    }
});


// ─── GET /api/dashboard/:identifier/summary/family ──────────────────────────
// Generate a family-friendly summary: general health, basic condition, reassurance
router.get('/:identifier/summary/family', async (req, res) => {
    try {
        const log = await findUserLog(req.params.identifier);
        if (!log || !log.history.length) {
            return res.json({ summary: 'No health records available yet. Ask her to talk to Janani!' });
        }

        const history = log.history;
        const recent = history.slice(-15);

        // General health indicators
        const avgSeverity = recent.reduce((sum, h) => sum + (h.severity_score || 0), 0) / recent.length;
        const healthStatus = avgSeverity <= 3 ? 'Good' : avgSeverity <= 6 ? 'Needs Attention' : 'Needs Immediate Care';

        // Symptoms mentioned recently
        const recentSymptoms = [];
        recent.forEach(h => {
            (h.symptoms || []).forEach(s => {
                if (!recentSymptoms.find(r => r.name === s.name)) {
                    recentSymptoms.push({ name: s.name, status: s.status });
                }
            });
        });

        // Relief patterns
        const reliefCount = recent.filter(h => h.relief_noted).length;

        // Medications being taken
        const meds = [];
        recent.forEach(h => {
            (h.medications || []).forEach(m => {
                if (m.taken && !meds.includes(m.name)) meds.push(m.name);
            });
        });

        const summary = {
            generatedAt: new Date().toISOString(),
            overallHealth: healthStatus,
            averageSeverity: parseFloat(avgSeverity.toFixed(1)),
            recentSymptoms: recentSymptoms.map(s => `${s.name} (${s.status})`),
            medicationsTaken: meds,
            reliefOccurrences: reliefCount,
            totalRecentChats: recent.length,
            message: healthStatus === 'Good'
                ? 'She is doing well! Her recent interactions show healthy patterns. Keep supporting her.'
                : healthStatus === 'Needs Attention'
                    ? 'She has mentioned some symptoms recently. Make sure she is comfortable and taking her medications.'
                    : 'Please ensure she sees a doctor soon. Some symptoms need medical attention.'
        };

        res.json({ summary });
    } catch (err) {
        console.error('Family summary error:', err);
        res.status(500).json({ message: 'Failed to generate family summary', error: err.message });
    }
});


// ─── GET /api/dashboard/:identifier/history ─────────────────────────────────
// Returns full chat history for "Read More" view
router.get('/:identifier/history', async (req, res) => {
    try {
        const log = await findUserLog(req.params.identifier);
        if (!log) {
            return res.json({ history: [] });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const allHistory = (log.history || []).slice().reverse();
        const paginated = allHistory.slice((page - 1) * limit, page * limit);

        const history = paginated.map(h => ({
            id: h._id,
            timestamp: h.timestamp,
            userMessageNative: h.user_message_native,
            userMessageEnglish: h.user_message_english,
            aiReplyNative: h.rag_reply_native,
            aiReplyEnglish: h.rag_reply_english,
            symptoms: h.symptoms,
            medications: h.medications,
            reliefNoted: h.relief_noted,
            reliefDetails: h.relief_details,
            fetalMovement: h.fetal_movement_status,
            severity: h.severity_score,
            aiSummary: h.ai_summary
        }));

        res.json({
            history,
            pagination: {
                page,
                limit,
                total: allHistory.length,
                totalPages: Math.ceil(allHistory.length / limit)
            }
        });
    } catch (err) {
        console.error('Chat history error:', err);
        res.status(500).json({ message: 'Failed to fetch chat history', error: err.message });
    }
});


module.exports = router;
