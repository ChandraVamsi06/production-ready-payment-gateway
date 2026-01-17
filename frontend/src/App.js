// frontend/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import WebhookConfig from './pages/WebhookConfig';
import ApiDocs from './pages/ApiDocs';
import Checkout from './pages/Checkout';

// Helper to hide nav on checkout page
const Navigation = () => {
  const location = useLocation();
  if (location.pathname === '/checkout') return null;
  
  return (
    <nav>
      <Link to="/webhooks">Webhook Config</Link>
      <Link to="/docs">Documentation</Link>
    </nav>
  );
};

const App = () => {
  return (
    <Router>
      <div className="container">
        <Navigation />
        <Routes>
          <Route path="/" element={<WebhookConfig />} />
          <Route path="/webhooks" element={<WebhookConfig />} />
          <Route path="/docs" element={<ApiDocs />} />
          <Route path="/checkout" element={<Checkout />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;