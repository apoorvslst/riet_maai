const mongoose = require('mongoose');

// ─── Symptom/Medication tracking per interaction ────────────────────────────
const symptomEntrySchema = new mongoose.Schema({
    name: { type: String, required: true },           // e.g. "headache", "nausea", "swelling"
    reported_time: { type: String, default: '' },      // e.g. "morning", "afternoon" — if mentioned
    status: {
        type: String,
        enum: ['active', 'relieved', 'recurring'],
        default: 'active'
    }
}, { _id: false });

const medicationEntrySchema = new mongoose.Schema({
    name: { type: String, required: true },            // e.g. "iron tablet", "paracetamol"
    taken: { type: Boolean, default: false },           // did she say she took it?
    taken_time: { type: String, default: '' },          // e.g. "morning", "daytime", "night"
    effect_noted: { type: String, default: '' }         // e.g. "feeling better", "no change"
}, { _id: false });

// ─── Each history entry = one call interaction ──────────────────────────────
const interactionSchema = new mongoose.Schema({
    timestamp: {
        type: Date,
        default: Date.now
    },
    // What the user said — bilingual
    user_message_native: { type: String, default: '' },
    user_message_english: { type: String, default: '' },
    // RAG-generated reply — bilingual
    rag_reply_native: { type: String, default: '' },
    rag_reply_english: { type: String, default: '' },
    // Clinical extraction by LLM
    symptoms: [symptomEntrySchema],
    medications: [medicationEntrySchema],
    relief_noted: { type: Boolean, default: false },     // did she mention feeling better / cured?
    relief_details: { type: String, default: '' },        // what relief was mentioned
    // AI metadata
    fetal_movement_status: {
        type: String,
        enum: ['Yes', 'No', 'Invalid'],
        default: 'No'
    },
    severity_score: { type: Number, default: 0 },
    ai_summary: { type: String, default: '' }
}, { _id: true });

// ─── Auto-generated summaries ───────────────────────────────────────────────
const summarySchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['daily', 'weekly', 'monthly'],
        required: true
    },
    period_start: { type: Date, required: true },
    period_end: { type: Date, required: true },
    generated_at: { type: Date, default: Date.now },
    summary_english: { type: String, default: '' },
    summary_native: { type: String, default: '' },
    // Aggregated tracking
    total_interactions: { type: Number, default: 0 },
    symptoms_timeline: { type: String, default: '' },     // symptom start → cure journey
    medications_timeline: { type: String, default: '' },  // medication adherence
    avg_severity: { type: Number, default: 0 },
    doctor_notes: { type: String, default: '' }           // key items for doctor review
}, { _id: true });

// ─── One document per user ──────────────────────────────────────────────────
const healthLogSchema = new mongoose.Schema({
    phone_number: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    user_email: {
        type: String,
        default: ''
    },
    history: [interactionSchema],
    summaries: [summarySchema],
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
});

healthLogSchema.pre('save', function (next) {
    this.updated_at = Date.now();
    next();
});

module.exports = mongoose.model('HealthLog', healthLogSchema);
