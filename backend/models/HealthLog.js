const mongoose = require('mongoose');

const healthLogSchema = new mongoose.Schema({
    phone_number: {
        type: String,
        required: true
    },
    fetal_movement_status: {
        type: String,
        required: true,
        enum: ['Yes', 'No', 'Invalid']
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('HealthLog', healthLogSchema);
