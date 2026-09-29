# INCIDENT INTELLIGENCE

> **“Every incident teaches the system how to handle the next one.”**

**INCIDENT INTELLIGENCE** is a production-style, hackathon-ready AI Incident Response Agent designed for SRE and DevOps teams. Its central differentiator is **Hindsight-powered long-term operational memory**.

Unlike stateless LLM chatbots that evaluate incidents in isolation, Incident Intelligence retains operational knowledge, past failed actions, human engineer corrections, and verified outcomes. When a similar incident strikes, the agent recalls past experience, avoids previously failed actions, and applies proven human corrections.

---

## 🌟 Key Features

1. **Deterministic Microservice Simulator**:
   - 8 services: API Gateway, User Service, Order Service, Payment Service, Inventory Service, Notification Service, Redis Cache Cluster, Primary PostgreSQL Database.
   - Generates live telemetry (request rate, error rate, P95 latency, CPU/Mem, DB connections, pool usage %, deployment version, alerts, logs).

2. **Hindsight Operational Memory Engine**:
   - Long-term memory store retaining 9 operational memory types: `INCIDENT`, `RCA`, `ACTION`, `FAILURE`, `CORRECTION`, `OUTCOME`, `VERIFICATION`, `RUNBOOK`, `PREVENTION`.
   - Semantic keyword scoring + vector retrieval matching symptoms and historical incidents.

3. **Past vs. Present Reasoning Matrix**:
   - Compares past signal metrics (e.g. 96% DB connections in past vs 98% present) and explains why historical memory is used as evidence, not blindly copied.

4. **Human Correction & Failure Avoidance Loop**:
   - Allows engineers to approve or reject recommendations with custom corrections.
   - Retains rejected actions as `FAILURE MEMORY` and engineer notes as `HUMAN CORRECTION`.
   - In subsequent incidents, the agent explicitly avoids naive failed actions (e.g., `restart_service`) and recommends human-proven remediations (e.g., `reduce_connection_pool` or `rollback_deployment`).

5. **Safe Action Engine & Real Verification**:
   - Enforces strict execution allowlist: `restart_service`, `rollback_deployment`, `scale_service`, `reduce_connection_pool`, `disable_faulty_dependency`, `clear_application_cache`.
   - Executes real metric modifications on simulator state.
   - Runs post-execution metric verification against operational thresholds (comparing BEFORE vs AFTER metrics).

6. **Memory Ablation & Evaluation System**:
   - Benchmark dashboard testing `WITH_MEMORY` vs `WITHOUT_MEMORY`.
   - Proves measurable empirical improvement between incidents.

---

## 🏗️ Architecture

```text
Frontend (Next.js 14 + React + TypeScript + Tailwind CSS)
             ↓  HTTP REST API
Backend API (Python 3.13 + FastAPI)
             ↓
Incident Agent State Machine 
  (INCIDENT_DETECTED -> INVESTIGATING -> RCA -> RECOMMENDATION -> APPROVAL -> EXECUTION -> VERIFYING -> RESOLVED)
             ├── Hindsight Memory Engine
             ├── Deterministic Simulator Engine (8 Services)
             ├── Safe Action Allowlist Engine
             └── Real Verification Engine
             ↓
SQLite / Async SQLAlchemy (or PostgreSQL + pgvector)
```

---

## 🚀 Quick Start (Local)

### Prerequisites
- Python 3.10+
- Node.js v18+ & npm

### 1. Start the Backend API
```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn backend.app.main:app --reload --port 8000
```
Backend API will run at `http://localhost:8000`. Test health at `http://localhost:8000/health`.

### 2. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend will run at `http://localhost:3000`.

---

## 🐳 One-Command Docker Setup

```bash
docker compose up --build
```
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- Database: PostgreSQL on port `5432`

---

## 🧪 Automated Testing

To execute backend automated tests validating Hindsight recall, failure avoidance, verification, and ablation benchmarks:

```bash
cd backend
python -m pytest backend/tests/test_backend.py
```

---

## ⏱️ 3-Minute Hackathon Demo Script

Go to `http://localhost:3000/demo` or follow the steps below:

1. **0:00–0:30 (Incident Injection)**: Click **START DEMO**. Hero Incident 1 (`INCIDENT_1_DB_EXHAUSTION`) is injected. DB connections spike to 98/100, Payment error rate 17.8%, latency P95 4250ms due to Payment Service v2.5 pool leak.
2. **0:30–1:30 (Hindsight Recall & Reasoning)**: Click **AGENT INVESTIGATE & RECALL**. The agent queries Hindsight long-term memory. It recalls:
   - Past Failure Memory: `restart_service FAILED previously (pool remained saturated)`
   - SRE Human Correction: `Senior SRE: Recycle pool & reduce connection pressure or rollback v2.5`
   - Agent UI displays: `⚡ THIS DECISION WAS DIRECTLY INFLUENCED BY PREVIOUS EXPERIENCE`.
3. **1:30–2:30 (Approval, Execution & Verification)**: Click **APPROVE & VERIFY**. `reduce_connection_pool` executes against simulator. Real metric verification evaluates DB connections dropping from 98% to 32%, error rate dropping to 0.15%. Verification status: `VERIFICATION_PASSED`. Postmortem is generated and retained in Hindsight.
4. **2:30–3:00 (Incident 2 Learning Proof)**: Click **TRIGGER INCIDENT 2**. Similar DB incident strikes. The agent instantly recalls the retained knowledge and picks `reduce_connection_pool` on the **very first attempt!**

> **“We don't just resolve incidents. We make every incident useful for the next one.”**

---

## 🛡️ Trust & Safety Model
- **No Arbitrary LLM Execution**: Only pre-approved allowlisted actions are executed.
- **Human-in-the-Loop Approval**: Risky actions require explicit human approval.
- **Real Verification**: Incident recovery is valid only after metric verification satisfies operational threshold conditions.
