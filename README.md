# HealthGrid: Decentralized Healthcare Data Sharing & Access Control Platform

> Decentralized healthcare data sharing and access control platform using blockchain, smart contracts, IPFS, and attribute-based encryption policies.

---

## 📌 Overview

**HealthGrid** (SecureChain) is an end-to-end prototype designed to solve critical security, privacy, and interoperability challenges in electronic health record (EHR) exchange. By combining decentralized identity concepts, attribute-based access control (ABAC/CP-ABE), authenticated symmetric encryption (AES-256-GCM), decentralized storage (IPFS), and Ethereum smart contracts, HealthGrid empowers patients to retain full sovereignty over their medical records while granting fine-grained, auditable access to healthcare providers.

---

## 🏗 Architecture & System Design

The HealthGrid platform consists of three decoupled layers:

```
                                  ┌───────────────────────────────┐
                                  │      Next.js Web Client       │
                                  │  (Patient / Doctor / Admin)   │
                                  └───────────────┬───────────────┘
                                                  │ HTTP / REST
                                                  ▼
                                  ┌───────────────────────────────┐
                                  │    Django REST API Backend    │
                                  │   (Policy & Crypto Engine)    │
                                  └───┬───────────────────────┬───┘
                                      │                       │
                AES-256-GCM Uploads   │                       │ JSON-RPC (Web3.py)
                                      ▼                       ▼
                     ┌───────────────────────────┐  ┌───────────────────────────┐
                     │   Decentralized Storage   │  │    Ethereum Blockchain    │
                     │  (IPFS Kubo / Local FS)   │  │ (Hardhat / Smart Contract)│
                     └───────────────────────────┘  └───────────────────────────┘
```

1. **Smart Contracts (`contracts/`)**:
   - `AuditLogger.sol`: Records immutable on-chain audit trails for all record registrations, access requests, decryption attempts, and consent revocations.
   - `MedicalRecordRegistry.sol`: Decentralized registry managing record metadata, patient ownership, and active policy hashes.
   - `AccessControlManager.sol`: On-chain role and attribute verification logic with emergency access logging.
2. **Backend API (`backend/`)**:
   - **Records Service (`records/`)**: Handles file ingestion, authenticated symmetric encryption (AES-256-GCM), and access evaluation.
   - **Attribute Authority (`attribute_authority/`)**: Manages clinician identities, medical specialties, hospital affiliations, and clearance levels.
   - **Education Service (`education/`)**: Provides simulation and interactive learning modules on CP-ABE access trees and decentralized trust.
   - **Blockchain Client (`records/blockchain.py`)**: Interacts with the Ethereum smart contracts using Web3.py.
   - **Storage Abstraction (`records/storage.py`)**: Stores encrypted payloads locally or via IPFS Kubo HTTP API.
3. **Frontend Application (`frontend/`)**:
   - Built with **Next.js 16** (App Router), **React 19**, and **Tailwind CSS**.
   - **Patient Portal**: Patient-centric dashboard to upload medical records, define custom access policies (e.g., Department = Cardiology AND Role = Specialist), and revoke access in real time.
   - **Doctor Portal**: Clinician dashboard to inspect available records, evaluate attribute policies against clinician credentials, and decrypt authorized medical reports.
   - **Admin Portal**: System monitoring dashboard for auditing on-chain transactions, reviewing access metrics, and managing attribute authority assignments.
   - **Education Portal**: Interactive educational modules demonstrating CP-ABE tree evaluation and decentralized healthcare data workflows.

---

## 🛠 Technology Stack

- **Smart Contracts & Web3**: Solidity `^0.8.20`, Hardhat, Ethers.js, Web3.py
- **Backend**: Python 3.10+, Django 5.2, Django REST Framework, django-cors-headers, cryptography (PyCA), python-dotenv
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS, Lucide Icons
- **Storage**: Local encrypted filesystem storage with optional IPFS Kubo HTTP API integration

---

## ⚙️ Environment Variables Setup

Configuration is managed via `.env` files based on the included `.env.example` templates.

### 1. Backend Configuration (`backend/.env`)

Copy `backend/.env.example` to `backend/.env`:

```bash
# In backend/
cp .env.example .env
```
*(On Windows CMD: `copy .env.example .env`)*

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `DJANGO_SECRET_KEY` | Secret key for Django cryptographic signing and encryption key derivation. | Random secure string |
| `DJANGO_DEBUG` | Enables Django debug output. | `true` |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated list of allowed hosts. | `127.0.0.1,localhost` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of allowed frontend origins. | `http://localhost:3000,http://127.0.0.1:3000` |
| `BLOCKCHAIN_RPC_URL` | Local Ethereum node JSON-RPC endpoint. | `http://127.0.0.1:8545` |
| `BLOCKCHAIN_ACCOUNT` | Ethereum address for executing audit transactions. | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` |
| `BLOCKCHAIN_DEPLOYMENT_FILE` | Path to contract deployment JSON. | `../contracts/deployment.json` |
| `KUBO_API_URL` | Optional IPFS Kubo HTTP API endpoint (leave empty for local disk). | `http://127.0.0.1:5001` |

### 2. Frontend Configuration (`frontend/.env.local`)

Copy `frontend/.env.example` to `frontend/.env.local`:

```bash
# In frontend/
cp .env.example .env.local
```
*(On Windows CMD: `copy .env.example .env.local`)*

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Base API endpoint for the Django backend. | `http://127.0.0.1:8001/api` |

---

## 🚀 Installation & Setup

### Prerequisites

- **Python 3.10+**
- **Node.js 20+** or **22.13+** with **npm**
- **Git**

---

### Step 1: Smart Contracts

1. Navigate to the `contracts/` directory:
   ```bash
   cd contracts
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Compile Solidity smart contracts:
   ```bash
   npx hardhat compile
   ```

---

### Step 2: Backend API

1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   - **Windows (PowerShell)**:
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
   - **macOS / Linux**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```
3. Install dependencies:
   ```bash
   python -m pip install --upgrade pip
   pip install -r requirements.txt
   ```
4. Set up environment variables (copy `.env.example` to `.env`).
5. Run database migrations:
   ```bash
   python manage.py makemigrations attribute_authority records education
   python manage.py migrate
   ```
6. Seed demo clinicians and attributes:
   ```bash
   python seed_data.py
   ```

---

### Step 3: Frontend Web Portal

1. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables (copy `.env.example` to `.env.local`).

---

## 🏃 Running the Services Separately

To run the complete platform, start the services across four terminal windows:

### Terminal 1: Hardhat Blockchain Node
```bash
cd contracts
npm run node
```
*Starts local Ethereum node on `http://127.0.0.1:8545`.*

### Terminal 2: Deploy Smart Contracts
```bash
cd contracts
npm run deploy:local
```
*Deploys `AuditLogger.sol` and writes `contracts/deployment.json`.*

### Terminal 3: Django Backend API
```bash
cd backend
# Activate venv first: .\venv\Scripts\Activate.ps1 or source venv/bin/activate
python manage.py runserver 127.0.0.1:8001
```
*API available at `http://127.0.0.1:8001` (Health check: `http://127.0.0.1:8001/api/health/`).*

### Terminal 4: Next.js Frontend
```bash
cd frontend
npm run dev
```
*Web application available at `http://localhost:3000`.*

---

## 🧪 Testing

- **Backend Tests**:
  ```bash
  cd backend
  python manage.py test
  ```
- **Contract Tests**:
  ```bash
  cd contracts
  npm test
  ```
- **Frontend Build**:
  ```bash
  cd frontend
  npm run build
  ```

---

## ⚠️ Limitations & Disclaimer

This project is an **academic demonstration, research prototype, and educational proof-of-concept**. It is not intended for production clinical use:
- **Cryptographic Model**: The demonstration simulates CP-ABE policy validation backed by authenticated symmetric encryption (AES-256-GCM) at rest. In this prototype, the backend server performs policy validation and decryption.
- **Access Control & Identity**: Clinician identities are simulated demonstration personas without OAuth2/OIDC or hardware key attestation.
- **Blockchain Keys**: The pre-configured Ethereum keys are standard Hardhat public test accounts and must never be used with real digital assets or on public networks.
- **HIPAA / GDPR**: Do not store real patient medical records or Protected Health Information (PHI) in this local test environment.
