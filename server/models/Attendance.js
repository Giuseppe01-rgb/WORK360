const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    site: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ConstructionSite',
        required: true
    },
    clockIn: {
        time: {
            type: Date,
            required: true
        },
        location: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point'
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                required: true
            },
            address: String
        }
    },
    clockOut: {
        time: Date,
        location: {
            type: {
                type: String,
                enum: ['Point']
            },
            coordinates: [Number],
            address: String
        }
    },
    totalHours: {
        type: Number,
        default: 0
    },
    notes: String
}, {
    timestamps: true
});

// Index for geospatial queries
attendanceSchema.index({ 'clockIn.location': '2dsphere' });

module.exports = mongoose.model('Attendance', attendanceSchema);
