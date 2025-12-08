const axios = require('axios');

const TBANK_API_URL = process.env.TBANK_API_URL || 'https://api.tbank.ru';
const TBANK_TERMINAL_KEY = process.env.TBANK_TERMINAL_KEY;
const TBANK_SECRET_KEY = process.env.TBANK_SECRET_KEY;

async function createPayment(userId, amount, days) {
    try {
        const paymentId = `payment_${userId}_${Date.now()}`;
        const mockPaymentUrl = `${process.env.WEBAPP_URL || 'https://your-app.vercel.app'}/payment?payment_id=${paymentId}`;
        
        return {
            payment_id: paymentId,
            payment_url: mockPaymentUrl,
            amount: amount,
            status: 'pending'
        };
    } catch (error) {
        console.error('Payment creation error:', error);
        throw new Error('Failed to create payment session');
    }
}

async function confirmPayment(paymentId) {
    try {
        return {
            status: 'pending',
            payment_id: paymentId
        };
    } catch (error) {
        console.error('Payment confirmation error:', error);
        throw new Error('Failed to confirm payment');
    }
}

module.exports = {
    createPayment,
    confirmPayment
};

