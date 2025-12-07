const axios = require('axios');

// T-Bank API configuration
const TBANK_API_URL = process.env.TBANK_API_URL || 'https://api.tbank.ru';
const TBANK_TERMINAL_KEY = process.env.TBANK_TERMINAL_KEY;
const TBANK_SECRET_KEY = process.env.TBANK_SECRET_KEY;

/**
 * Create a payment session with T-Bank
 * This is a mock implementation - replace with actual T-Bank API calls
 */
async function createPayment(userId, amount, days) {
    try {
        // Generate unique payment ID
        const paymentId = `payment_${userId}_${Date.now()}`;

        // In production, make actual API call to T-Bank
        // Example:
        /*
        const response = await axios.post(`${TBANK_API_URL}/v2/Init`, {
            TerminalKey: TBANK_TERMINAL_KEY,
            Amount: amount * 100, // Convert to kopecks
            OrderId: paymentId,
            Description: `Bookflix subscription for ${days} days`,
            SuccessURL: `${process.env.WEBAPP_URL}/success`,
            FailURL: `${process.env.WEBAPP_URL}/fail`,
        }, {
            headers: {
                'Content-Type': 'application/json',
            }
        });
        */

        // Mock response for development
        // Replace this with actual T-Bank API response
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

/**
 * Confirm payment status
 * Check with T-Bank if payment was successful
 */
async function confirmPayment(paymentId) {
    try {
        // In production, check payment status with T-Bank API
        // Example:
        /*
        const response = await axios.post(`${TBANK_API_URL}/v2/GetState`, {
            TerminalKey: TBANK_TERMINAL_KEY,
            PaymentId: paymentId,
        });
        
        return {
            status: response.data.Status === 'CONFIRMED' ? 'success' : 'pending',
            payment_data: response.data
        };
        */

        // Mock implementation - in production, this should check actual payment status
        // For now, we'll simulate a successful payment after a delay
        // In real implementation, you would check the T-Bank API
        
        return {
            status: 'pending', // Change to 'success' when payment is confirmed
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

