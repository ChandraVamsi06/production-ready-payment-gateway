# Production-Ready Payment Gateway

A robust, event-driven payment gateway implementation using **Node.js**, **Redis queues**, and **PostgreSQL**. Designed for high concurrency, fault tolerance, and scalability using a microservices architecture.

## ✨ Key Features

* **Asynchronous Processing:** Payments are offloaded to **BullMQ (Redis)** queues, preventing main-thread blocking during high loads.
* **Reliable Webhooks:** Event notifications (`payment.success`) are delivered with **Exponential Backoff** retries (Immediate -> 1m -> 5m -> 30m).
* **Idempotency:** Prevents duplicate charges by caching API responses using Idempotency Keys.
* **Fault Tolerance:** Background workers automatically restart and retry failed jobs.
* **Merchant Dashboard:** Real-time UI to view transactions, configure webhooks, and manually retry failed notifications.
* **Secure Checkout:** Embeddable React widget for capturing payments.

## 🛠️ Tech Stack

* **Backend:** Node.js, Express
* **Queue:** BullMQ, Redis (Persistence enabled)
* **Database:** PostgreSQL 15
* **Frontend:** React.js (Dashboard & Checkout)
* **Containerization:** Docker & Docker Compose

## ⚡ Quick Start (Evaluation)

The project is fully Dockerized. No local `node_modules` are required.

### 1. Prerequisites

* Docker Desktop installed and running.

### 2. Start the Application

Run the following command in the root directory:

```bash
docker-compose up --build

```

*Wait for the logs to show "Workers are listening for jobs..."*

### 3. Access the Services

* **Merchant Dashboard:** [http://localhost:3000](https://www.google.com/search?q=http://localhost:3000)
* **Checkout Page:** [http://localhost:3000/checkout](https://www.google.com/search?q=http://localhost:3000/checkout)
* **API Health Check:** [http://localhost:8000/health](https://www.google.com/search?q=http://localhost:8000/health)

## 🧪 How to Test

### 1. Process a Payment

1. Go to [http://localhost:3000/checkout](https://www.google.com/search?q=http://localhost:3000/checkout).
2. Click **"Pay Now"**.
3. The request is sent to the API -> Queued in Redis -> Processed by Worker.
4. You will see a "Payment Successful" screen.

### 2. Test Webhooks & Retries

1. Go to the **Dashboard** at [http://localhost:3000](https://www.google.com/search?q=http://localhost:3000).
2. Enter a test URL (e.g., from [webhook.site](https://webhook.site)) in the configuration box.
3. Click **"Save Configuration"**.
4. Find a "Failed" log entry in the table and click **"Retry"**.
5. Refresh the page after 5 seconds to see the status turn **Green (Success)**.

### 3. Verify Job Queues

The evaluator can check the health of the Redis queues via this endpoint:
`GET http://localhost:8000/api/v1/test/jobs/status`

## 📚 API Documentation

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/v1/payments` | Create a payment (Async) |
| `POST` | `/api/v1/payments/:id/capture` | Capture a payment |
| `POST` | `/api/v1/payments/:id/refunds` | Initiate a partial/full refund |
| `GET` | `/api/v1/webhooks` | List webhook logs |
| `PUT` | `/api/v1/webhooks/settings` | Update merchant webhook URL |