import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

// Headers for auth (using test keys for simplicity as per requirements)
const HEADERS = {
  'X-Api-Key': 'key_test_abc123',
  'X-Api-Secret': 'secret_test_xyz789'
};

const WebhookConfig = () => {
  const [logs, setLogs] = useState([]);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('whsec_test_abc123'); // Defined state here

  // Fetch logs AND current settings from backend
  const fetchLogs = async () => {
    try {
      const res = await axios.get(`${API_URL}/webhooks?limit=20`, { headers: HEADERS });
      setLogs(res.data.data);
      
      // Load saved settings from backend if they exist so the UI matches the DB
      if (res.data.config) {
        if (res.data.config.webhook_url) setWebhookUrl(res.data.config.webhook_url);
        if (res.data.config.webhook_secret) setWebhookSecret(res.data.config.webhook_secret);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000); // Poll every 5s for updates
    return () => clearInterval(interval);
  }, []);

  const handleRetry = async (id) => {
    try {
      await axios.post(`${API_URL}/webhooks/${id}/retry`, {}, { headers: HEADERS });
      alert('Retry scheduled! (Wait 5s and refresh)');
      fetchLogs();
    } catch (err) {
      console.error(err);
      alert('Retry failed');
    }
  };

  // REAL save function that talks to the backend
  const saveConfig = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/webhooks/settings`, {
        webhookUrl,
        webhookSecret
      }, { headers: HEADERS });
      alert('Configuration Saved Successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save configuration. Check console for details.');
    }
  };

  return (
    <div data-test-id="webhook-config">
      <h2>Webhook Configuration</h2>
      
      <form data-test-id="webhook-config-form" onSubmit={saveConfig} className="card">
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Webhook URL</label>
          <input
            data-test-id="webhook-url-input"
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://yoursite.com/webhook"
            required
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ marginRight: '10px' }}>Webhook Secret:</label>
          <code data-test-id="webhook-secret">{webhookSecret}</code>
        </div>

        <button data-test-id="save-webhook-button" type="submit">Save Configuration</button>
      </form>

      <h3>Webhook Logs</h3>
      <div className="card">
        <table data-test-id="webhook-logs-table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Status</th>
              <th>Attempts</th>
              <th>Last Attempt</th>
              <th>Code</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id} data-test-id="webhook-log-item" data-webhook-id={log.id}>
                <td data-test-id="webhook-event">{log.event}</td>
                <td data-test-id="webhook-status">
                    <span className={`status-badge status-${log.status}`}>
                        {log.status}
                    </span>
                </td>
                <td data-test-id="webhook-attempts">{log.attempts}</td>
                <td data-test-id="webhook-last-attempt">
                    {log.last_attempt_at ? new Date(log.last_attempt_at).toLocaleString() : '-'}
                </td>
                <td data-test-id="webhook-response-code">{log.response_code || '-'}</td>
                <td>
                  {log.status === 'failed' && (
                    <button
                      data-test-id="retry-webhook-button"
                      data-webhook-id={log.id}
                      onClick={() => handleRetry(log.id)}
                    >
                      Retry
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan="6" style={{textAlign: 'center'}}>No logs yet. Make a payment!</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WebhookConfig;