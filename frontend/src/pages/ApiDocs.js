// frontend/src/pages/ApiDocs.js
import React from 'react';

const ApiDocs = () => {
  return (
    <div data-test-id="api-docs">
      <h2>Integration Guide</h2>

      <section data-test-id="section-create-order" className="card">
        <h3>1. Create Payment</h3>
        <p>Make a POST request to your backend to initiate a payment.</p>
        <pre data-test-id="code-snippet-create-order">
{`curl -X POST http://localhost:8000/api/v1/payments \\
  -H "X-Api-Key: key_test_abc123" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 50000,
    "currency": "INR",
    "method": "upi",
    "order_id": "order_123"
  }'`}
        </pre>
      </section>

      <section data-test-id="section-sdk-integration" className="card">
        <h3>2. SDK Integration</h3>
        <p>Add this script to your frontend to open the payment modal.</p>
        <pre data-test-id="code-snippet-sdk">
{`<script src="http://localhost:3001/checkout.js"></script>
<script>
  const checkout = new PaymentGateway({
    key: 'key_test_abc123',
    orderId: 'order_123',
    onSuccess: (response) => {
      console.log('Payment Success:', response);
    },
    onFailure: (error) => {
      console.log('Payment Failed:', error);
    }
  });
  
  document.getElementById('pay-btn').onclick = () => checkout.open();
</script>`}
        </pre>
      </section>

      <section data-test-id="section-webhook-verification" className="card">
        <h3>3. Verify Webhooks</h3>
        <p>Verify the HMAC signature to ensure the request is from us.</p>
        <pre data-test-id="code-snippet-webhook">
{`const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
    
  return signature === expectedSignature;
}`}
        </pre>
      </section>
    </div>
  );
};

export default ApiDocs;