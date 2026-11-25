# 🚀 Cache-as-a-Service (CaaS)

### A Developer-First Caching and Rate-Limiting Platform

<p align="center">
  <a href="https://caas-kdnv.onrender.com/">
    <img src="https://img.shields.io/badge/Live%20Demo-Visit%20CaaS-brightgreen?style=for-the-badge" alt="Live Demo" />
  </a>
  <a href="https://github.com/NancyJangra/CaaS">
    <img src="https://img.shields.io/badge/GitHub-Repository-black?style=for-the-badge&logo=github" alt="GitHub Repository" />
  </a>
</p>

---

## 📌 Overview

**Cache-as-a-Service (CaaS)** is a full-stack developer platform that provides hosted caching and rate-limiting capabilities through a simple REST API.

Modern applications frequently make repeated database queries and external API calls, resulting in increased response times, unnecessary server load, and higher infrastructure costs. Although caching can solve these problems, setting up and maintaining caching infrastructure often requires additional configuration and management.

CaaS simplifies this process by providing a hosted caching service accessible through a REST API, along with an interactive developer dashboard.

Developers can generate API keys, integrate caching into their applications, manage cached entries, monitor cache performance, and track API usage without independently managing the underlying caching infrastructure.

## 🎯 Problem Statement

Developers often face challenges such as:

- Repeated database queries and API requests.
- Slow application response times.
- Increased backend workload.
- Complexity of managing caching infrastructure.
- Lack of visibility into cache performance.
- Difficulty monitoring API consumption and usage limits.

**CaaS addresses these challenges by providing a centralized solution that makes caching easier to integrate, monitor, and manage.**

---

## ✨ Key Features

### 1. Hosted Caching API
- Store, retrieve, and delete cached values through REST API endpoints.
- Configure Time-to-Live (TTL) for individual cache entries.
- Identify cache hits and misses through response headers.
- Reduce repeated database and external API calls.

### 2. Interactive Developer Dashboard
- Monitor total API requests and cache performance.
- Track cache hit rate and miss statistics.
- Visualize response-time improvements.
- View usage statistics and quota consumption.
- Monitor caching activity through charts and analytics.

### 3. API Key Management
- Generate unique API keys for developers.
- Authenticate requests using API key headers.
- Regenerate and revoke API keys.
- Store hashed API keys for improved security.

### 4. Cache Management
- View stored cache entries.
- Search and manage cached keys.
- Update TTL for existing entries.
- Delete individual cached entries.
- Clear all cached entries when required.

### 5. Rate Limiting and Usage Monitoring
- Control API request frequency.
- Implement rate limiting using Redis.
- Track API consumption against usage limits.
- Monitor remaining requests and quota usage.
- Provide feedback when usage limits are approached or exceeded.

### 6. Developer Integration
- Simple REST API integration.
- Ready-to-use code examples.
- Copyable integration snippets.
- API connection testing.
- Easy integration with external applications.

### 7. Authentication and Security
- JWT-based authentication for dashboard access.
- Password hashing using bcrypt.
- SHA-256 hashing for API keys.
- User-specific cache isolation.
- Request validation and rate limiting.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, React Router |
| UI Styling | Tailwind CSS / Material UI |
| Data Fetching | TanStack Query |
| Data Visualization | Recharts |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Cache Engine | Redis |
| Authentication | JWT, bcrypt |
| Infrastructure | Docker, Docker Compose |
| Deployment | Render |

---

## 🏗️ System Architecture

CaaS follows a layered architecture consisting of a frontend dashboard, backend services, a relational database, and an in-memory caching engine.

```text
              ┌──────────────────────────┐
              │       CLIENT LAYER       │
              │                          │
              │   React Dashboard        │
              │   Developer Application │
              └────────────┬─────────────┘
                           │
              ┌────────────▼─────────────┐
              │      BACKEND LAYER       │
              │                          │
              │      Node.js + Express   │
              │                          │
              │  Authentication Service │
              │  Dashboard API           │
              │  Public Cache API        │
              │  Rate Limiting           │
              └───────┬──────────┬───────┘
                      │          │
              ┌───────▼────┐ ┌───▼──────────┐
              │   Redis    │ │  PostgreSQL  │
              │            │ │              │
              │ Cached     │ │ Users        │
              │ Values     │ │ API Keys     │
              │ TTL        │ │ Usage Events │
              │ Rate Limit │ │ Analytics    │
              └────────────┘ └──────────────┘
```

### Request Workflow

1. A developer registers and obtains an API key.
2. The developer integrates the CaaS API into their application.
3. The application sends a request with its API key.
4. The backend authenticates the request and checks rate limits.
5. Redis checks whether the requested value exists in the cache.
6. The API returns the cached value on a hit or a cache miss response when the value is unavailable.
7. Usage information is recorded for monitoring and analytics.
8. The developer dashboard displays cache performance and usage statistics.

### Data Storage

**Redis**
- Stores cached values.
- Manages TTL for cache entries.
- Maintains rate-limit counters.

**PostgreSQL**
- Stores user information.
- Manages API key metadata.
- Records API usage events.
- Supports dashboard analytics.

---

## 🔌 API Documentation

CaaS provides REST API endpoints for cache operations and dashboard management.

### Public Cache API

All public cache requests require an API key in the `x-api-key` request header.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/v1/cache/:key` | Retrieve a cached value |
| PUT | `/v1/cache/:key` | Store a value with optional TTL |
| DELETE | `/v1/cache/:key` | Delete a cached value |

### Dashboard API

Dashboard endpoints use JWT-based authentication.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/signup` | Register a new user |
| POST | `/auth/login` | Authenticate a user |
| GET | `/api/me` | Retrieve user profile |
| GET / POST / DELETE | `/api/keys` | Manage API keys |
| GET | `/api/stats` | Retrieve cache statistics |
| GET | `/api/items` | List cached entries |
| PATCH | `/api/items/:key` | Update cache TTL |
| DELETE | `/api/items/:key` | Delete a cache entry |
| DELETE | `/api/items` | Clear cached entries |
| GET | `/api/usage` | Retrieve usage statistics |

### Cache Response Headers

| Header | Description |
|---|---|
| `X-Cache` | Indicates HIT or MISS |
| `X-RateLimit-Limit` | Maximum allowed requests |
| `X-RateLimit-Remaining` | Remaining requests |
| `X-RateLimit-Reset` | Rate-limit reset information |

---

## 💻 API Usage Examples

### 1. Store Data in Cache

```bash
curl -X PUT http://localhost:3001/v1/cache/user:42 \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"value":{"name":"Nancy"},"ttl":300}'
```

### 2. Retrieve Cached Data

```bash
curl -X GET http://localhost:3001/v1/cache/user:42 \
  -H "x-api-key: YOUR_API_KEY"
```

### 3. Delete Cached Data

```bash
curl -X DELETE http://localhost:3001/v1/cache/user:42 \
  -H "x-api-key: YOUR_API_KEY"
```

---

## ⚙️ Getting Started

Follow these steps to run CaaS locally.

### Prerequisites

- Node.js and npm
- Docker and Docker Compose
- PostgreSQL
- Redis
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/NancyJangra/CaaS.git
cd CaaS
```

### 2. Start Infrastructure

```bash
docker compose up -d
```

### 3. Configure the Backend

```bash
cd backend
```

Create an environment configuration file:

```bash
cp .env.example .env
```

Configure the required environment variables according to your project configuration.

Example:

```env
PORT=3001
JWT_SECRET=your_jwt_secret
DATABASE_URL=your_postgresql_connection
REDIS_URL=your_redis_connection
```

Install dependencies and start the backend:

```bash
npm install
npm run dev
```

### 4. Configure the Frontend

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Configure the frontend API base URL to point to your running backend.

### 5. Access the Application

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:3001 |
| Live Application | https://caas-kdnv.onrender.com/ |

*Note: Environment variables and startup scripts should match the actual configuration files in the repository.*

---

## 🔐 Security Implementation

Security is an important part of the CaaS architecture.

- **Password Security:** User passwords are hashed using bcrypt.
- **API Key Protection:** API keys are stored as SHA-256 hashes rather than plaintext.
- **Authentication:** JWT-based authentication protects dashboard endpoints.
- **Rate Limiting:** Restricts excessive API requests.
- **Tenant Isolation:** User-specific Redis namespaces and database queries prevent cross-user data access.
- **Input Validation:** Validates incoming requests and cache values.
- **Security Headers:** Uses Helmet and CORS configuration.

---

## 🎨 Human-Computer Interaction (HCI)

CaaS focuses not only on backend functionality but also on making infrastructure understandable and easy to manage.

The developer dashboard incorporates established HCI principles:

| HCI Principle | Implementation |
|---|---|
| Visibility of System Status | Cache statistics, analytics, and usage indicators |
| User Control and Freedom | Undo actions, API key regeneration, and deletion controls |
| Error Prevention | Input validation and confirmation for destructive actions |
| Recognition Rather Than Recall | Pre-filled integration snippets and searchable cache entries |
| Consistency | Reusable layouts, buttons, tables, and navigation |
| Accessibility | Keyboard navigation, focus indicators, and readable contrast |
| Aesthetic and Minimalist Design | Clean dashboard with focused visualizations |

---

## 🚀 Deployment

CaaS is deployed and accessible online through Render.

**Live Application:**  
https://caas-kdnv.onrender.com/

**GitHub Repository:**  
https://github.com/NancyJangra/CaaS

---

## 🔮 Future Enhancements

Potential improvements to the platform include:

- WebSocket-based real-time analytics.
- Per-key cache performance monitoring.
- Webhook notifications for usage thresholds.
- Team accounts and collaborative access.
- Redis Cluster support for distributed caching.
- Advanced cache eviction and optimization policies.
- More detailed performance analytics.

---

## 👥 Project Team

**Project Title:** Cache-as-a-Service (CaaS)

| S. No. | Student ID | Team Member |
|---|---|---|
| 1 | 911012025 | Shristi Shukla |
| 2 | 12401012024 | Nalini Bhardwaj |
| 3 | 14201012024 | Palak Batra |
| 4 | 12701012024 | Nancy |

---



<p align="center">

### Cache smarter. Build faster. Scale better.


</p>
