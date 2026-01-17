// frontend/src/pages/Checkout.js
import React, { useState } from 'react';
import axios from 'axios';

const Checkout = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, success, failed

  // Helper to send message to parent window (SDK)
  const sendMessage = (type, data) => {
    if (window.parent) {
      window.parent.postMessage({ type, data }, '*');
    }
  };

  const handlePayment = async () => {
    setLoading(true);
    try {
      // 1. Create Payment on Backend
      const res = await axios.post('http://localhost:8000/api/v1/payments', {
        amount: 50000, // Hardcoded for demo
        currency: 'INR',
        method: 'upi',
        order_id: 'order_' + Date.now(),
        vpa: 'user@upi'
      }, {
        headers: {
            'X-Api-Key': 'key_test_abc123', // Using test key
            'X-Api-Secret': 'secret_test_xyz789'
        }
      });

      // 2. Simulate User Interaction Delay
      await new Promise(r => setTimeout(r, 1000));

      // 3. Notify SDK
      setStatus('success');
      sendMessage('payment_success', { paymentId: res.data.id });

    } catch (error) {
      console.error(error);
      setStatus('failed');
      sendMessage('payment_failed', { error: 'Payment failed' });
    } finally {
      setLoading(false);
    }
  };

  if (status === 'success') {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <h2 style={{ color: 'green' }}>Payment Successful!</h2>
        <p>Redirecting...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Secure Checkout</h2>
      <div className="card">
        <p><strong>Merchant:</strong> Test Store</p>
        <p><strong>Amount:</strong> ₹500.00</p>
        
        <div style={{ margin: '20px 0' }}>
            <label>UPI ID:</label><br/>
            <input type="text" defaultValue="user@upi" disabled />
        </div>

        <button 
          onClick={handlePayment} 
          disabled={loading}
          style={{ 
            width: '100%', 
            background: '#28a745', 
            color: 'white', 
            padding: '12px',
            fontSize: '16px'
          }}
        >
          {loading ? 'Processing...' : 'Pay Now'}
        </button>
      </div>
    </div>
  );
};

export default Checkout;