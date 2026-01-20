const mongoose = require('mongoose');

const subscriptionSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ['Active', 'Expired', 'Cancelled'], default: 'Active' },
    paymentId: { type: String },
    amountPaid: { type: Number },
    mealType: { type: String, enum: ['both', 'lunch', 'dinner'], default: 'both' },
    deliveryAddress: {
        street: String,
        city: String,
        state: String,
        zip: String,
        country: String
    }
}, { timestamps: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);
