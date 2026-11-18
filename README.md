# HealthGrid: Decentralized Healthcare Data Sharing & Access Control Platform

> An academic prototype and research evaluation platform for decentralized electronic health records (EHR) data sharing, patient consent governance, and immutable audit trails using Ethereum smart contracts, authenticated AES-256-GCM encryption, attribute-based access control (ABAC), and IPFS.

---

## 📌 Executive Summary & Architecture

**HealthGrid** addresses the tension between patient data sovereignty, clinical interoperability, and regulatory auditability. The platform empowers patients to maintain ownership over their medical records, define granular attribute-based access policies, grant or withdraw clinical consent in real time, and audit all access events on an Ethereum smart contract ledger.

### System Architecture Diagram

```
                                  ┌─────────────────────────────────────────┐
                                  │           Next.js Web Client            │
                                  │ (Patient / Doctor / Admin / Education)  │
                                  └────────────────────┬────────────────────┘
                                                       │
                                     JWT Bearer Tokens │ JSON-RPC / REST
                                                       ▼
                                  ┌─────────────────────────────────────────┐
                                  │      Django REST Framework Backend      │
                                  │  (Policy Engine, Crypto, Outbox Queue)  │
                                  └───────┬─────────────────────────┬───────┘
                                          │                         │
            AES-256-GCM Encrypted Payload │                         │ Web3.py / JSON-RPC
                                          ▼                         ▼
                        ┌───────────────────────────┐   ┌───────────────────────────┐
                        │   Decentralized Storage   │   │    Ethereum Blockchain    │
                        │  (IPFS Kubo / Local Vault)│   │  (Hardhat Local Network)  │
                        └───────────────────────────┘   │                           │
                                                        │ - MedicalRecordRegistry   │
                                                        │ - AccessControlManager    │
                                                        │ - AuditLogger             │
                                                        └───────────────────────────┘
```

---

## 🔐 Security, Authentication & Role-Based Access Control

In HealthGrid, **all sensitive operations are authenticated server-side using JSON Web Tokens (SimpleJWT)**. Client-side identity assertions (such as selecting a doctor or typing a patient name) are never trusted for authorization.

### 1. User Roles & Permissions
- **Patient (`role: "patient"`)**:
  - Can upload new medical reports and define cryptographic access policies.
  - Can view only their own medical records (`owner == request.user`).
  - Controls clinical consent (`consent_granted`: `true` / `false`), which immediately allows or suspends clinical access.
  - Can grant or revoke access for individual verified clinicians.
  - Can permanently revoke medical records on-chain.
- **Doctor (`role: "doctor"`)**:
  - Linked to an Attribute Authority clinician record (`Doctor`).
  - Must be **verified** by an Administrator.
  - Can only access and decrypt records satisfying the record's ABAC policy where the patient has active consent.
  - Receives decrypted plaintext downloads in-memory; ciphertext remains encrypted in storage.
- **Administrator (`role: "admin"`)**:
  - Manages clinician verification and issues cryptographic attribute tags.
  - Monitors system-wide audit events and the on-chain blockchain outbox queue.
  - Reviews and approves academic dataset requests and student/intern accounts.
- **Education User (`role: "education"`)**:
  - Students, interns, and academic researchers accessing clinical case libraries, interactive CP-ABE policy simulators, and anonymized datasets.

### 2. Pre-Configured Demo Accounts (For Academic Demonstration)

The database includes ready-to-test accounts pre-populated via `python seed_data.py`:

| Role | Username | Password | Notes & Attributes |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `Admin@HealthGrid2026!` | System administration & Attribute Authority |
| **Patient** | `patient.alice` | `Patient@HealthGrid2026!` | Alice Johnson (contains pre-seeded EHR records) |
| **Patient** | `patient.bob` | `Patient@HealthGrid2026!` | Bob Smith (alternative patient identity) |
| **Doctor** | `dr.rajesh` | `Doctor@HealthGrid2026!` | Dr. Rajesh Sharma (`Dept:Cardiology`, `Clearance:Level3`) |
| **Doctor** | `dr.priya` | `Doctor@HealthGrid2026!` | Dr. Priya Nair (`Dept:Neurology`, `Clearance:Level2`) |
| **Doctor** | `dr.sunita` | `Doctor@HealthGrid2026!` | Dr. Sunita Deshmukh (`Dept:Emergency`, `Emergency:True`) |

---

## 🛡️ Cryptography & Policy Evaluation

HealthGrid combines authenticated symmetric encryption with server-side attribute-based access policy evaluation:

1. **Payload Encryption (AES-256-GCM)**:
   - Each medical file is encrypted at rest using AES-256 in Galois/Counter Mode (GCM).
   - Per-record 256-bit keys are derived using **HKDF-SHA256** from a master secret (`HEALTHGRID_ENCRYPTION_MASTER_KEY` / `SECRET_KEY`) with explicit salt and domain separation (`b"healthgrid:record-encryption:" + record_id`).
   - Nonces are cryptographically random 12-byte initialization vectors (`os.urandom(12)`).
   - Additional Authenticated Data (AAD) binds the ciphertext to the unique record ID (`HG02:<record_id>`), preventing ciphertext transplantation attacks.
2. **Attribute-Based Access Control (ABAC)**:
   - Access policies are structured boolean expression trees supporting `all` (conjunction) and `any` (disjunction) operators over clinical attribute strings (e.g. `{"all": ["Role:Doctor", "Dept:Cardiology"]}`).
   - The policy hash (`keccak256`) is registered on-chain in `MedicalRecordRegistry`.
3. **Consent Enforcement**:
   - Consent is a first-class citizen enforced prior to file retrieval or decryption.
   - If a patient withdraws consent, all decryption requests immediately return `403 Forbidden` and log a denied access event.

---

## ⛓️ Smart Contracts & Blockchain Integration

Three Solidity contracts (`^0.8.20`) deploy to the Ethereum network via Hardhat:

1. **`MedicalRecordRegistry.sol`**:
   - Manages record ownership, decentralized content identifiers (IPFS CID), and policy hashes (`bytes32 policyHash`).
   - Enforces that only the registered patient address can revoke records on-chain (`revokeRecord`).
2. **`AccessControlManager.sol`**:
   - Enforces access control lists, emergency access logging (`useEmergencyAccess`), and explicit clinician access grants (`grantAccess`, `revokeAccess`).
3. **`AuditLogger.sol`**:
   - Immutably records audit events (`recordId`, `action`, `actor`, `timestamp`).
   - Emits `AuditRecorded` events for decentralized monitoring.

### Resilient Outbox Pattern
The backend uses a `BlockchainTransaction` outbox queue. If the Ethereum JSON-RPC node is offline or experiences transient RPC latency, database state remains consistent and the transaction is recorded as pending/skipped with full error details for retry.

---

## 📦 Decentralized Storage (IPFS Kubo)

- When an IPFS Kubo daemon is available (`KUBO_API_URL=http://127.0.0.1:5001`), encrypted payloads are uploaded via the Kubo HTTP API (`/api/v0/add`) and the resulting Content Identifier (CID) is stored in the database and Ethereum registry.
- When IPFS is offline or unconfigured, HealthGrid falls back to local encrypted vault storage (`backend/media/encrypted_reports/`).
- **Unencrypted medical reports are never stored or transmitted over public IPFS networks.**

---

## 🌐 The Four Portals

| Portal | URL | Primary Capabilities |
| :--- | :--- | :--- |
| **Patient Portal** | `/patient` | Upload reports, formulate ABAC policies, toggle consent, grant/revoke doctor access, audit history |
| **Doctor Portal** | `/doctor` | View accessible patient records, evaluate attribute policies, decrypt authorized reports, view history |
| **Admin Console** | `/admin` | Manage Attribute Authority, verify/unverify clinicians, inspect audit logs, monitor blockchain queue |
| **Education & Research** | `/education` | Interactive CP-ABE simulator, clinical case studies, quizzes, dataset access requests, residency programs |

---

## 🔌 API Reference Summary

### Authentication (`/api/auth/`)
- `POST /api/auth/login/`: Authenticate user; returns JWT access + refresh tokens and user profile.
- `POST /api/auth/register/`: Register a new patient, doctor, or education user with hashed password.
- `GET /api/auth/me/`: Returns current authenticated user profile and permissions.
- `POST /api/auth/refresh/`: Refreshes expired JWT access token.
- `GET /api/auth/demo-users/`: Returns list of pre-configured demo personas.

### Medical Records (`/api/records/`)
- `GET /api/records/`: Lists records accessible to the authenticated role.
- `POST /api/records/`: Uploads, encrypts, pins, and registers an EHR report (Patient only).
- `POST /api/records/<id>/access/`: Evaluates policy and consent, decrypts report (Doctor only).
- `POST /api/records/<id>/revoke/`: Permanently revokes record on-chain (Patient / Admin).
- `POST /api/records/<id>/consent/`: Toggles patient consent (Patient only).
- `POST /api/records/<id>/grant-doctor/`: Grants/revokes explicit doctor access (Patient only).
- `GET /api/records/<id>/history/`: Returns detailed audit events for a record.
- `GET /api/audit/`: Role-filtered audit log.
- `GET /api/blockchain/transactions/`: Admin view of blockchain outbox transaction queue.

### Attribute Authority (`/api/attribute-authority/`)
- `GET /api/attribute-authority/doctors/`: Directory of clinicians and attributes.
- `POST /api/attribute-authority/doctors/`: Register new clinician identity (Admin only).
- `POST /api/attribute-authority/doctors/<id>/verify/`: Verify doctor (Admin only).
- `POST /api/attribute-authority/doctors/<id>/unverify/`: Suspend doctor verification (Admin only).

### Education & Research (`/api/education/` & `/api/admin/education/`)
- `GET /api/education/case-studies/`: Case studies with interactive quizzes.
- `POST /api/education/quizzes/<id>/attempt/`: Submit quiz answer.
- `POST /api/education/dataset-requests/`: Request research dataset.
- `GET /api/admin/education/users/`: Admin management of student/intern accounts.
- `POST /api/admin/education/dataset-requests/<id>/approve/`: Approve dataset access.

---

## 🛠️ Step-by-Step Installation & Setup

### Prerequisites
- **Python 3.10+**
- **Node.js 20+** or **22.13+** with **npm**
- **Git**

---

### Step 1: Smart Contracts (Hardhat)

```bash
cd contracts
npm install
npx hardhat compile
```

Deploy all three smart contracts:
```bash
npx hardhat run scripts/deploy.js
```
*This deploys `AuditLogger`, `MedicalRecordRegistry`, and `AccessControlManager`, generating `contracts/deployment.json`.*

---

### Step 2: Backend (Django & Web3)

```bash
cd backend
python -m venv venv

# On Windows:
.\venv\Scripts\Activate.ps1
# On macOS/Linux:
# source venv/bin/activate

python -m pip install --upgrade pip
pip install -r requirements.txt

# Configure environment variables
copy .env.example .env   # On macOS/Linux: cp .env.example .env

# Apply migrations
python manage.py makemigrations users records
python manage.py migrate

# Seed demo doctors and accounts
python seed_data.py
python education/seed_education.py
```

---

### Step 3: Frontend (Next.js)

```bash
cd frontend
npm install
copy .env.example .env.local   # On macOS/Linux: cp .env.example .env.local
```

---

## 🚀 Running the Project

Open 3 or 4 terminal windows:

### Terminal 1: Local Blockchain Node (Optional for on-chain execution)
```bash
cd contracts
npm run node
```
*Runs Ethereum node on `http://127.0.0.1:8545`.*

Deploy contracts to the running node:
```bash
npm run deploy:local
```

### Terminal 2: Django Backend API
```bash
cd backend
# Activate venv first: .\venv\Scripts\Activate.ps1 or source venv/bin/activate
python manage.py runserver 127.0.0.1:8001
```
*API available at `http://127.0.0.1:8001` (Health check: `http://127.0.0.1:8001/api/health/`).*

### Terminal 3: Next.js Frontend
```bash
cd frontend
npm run dev
```
*Web application available at `http://localhost:3000`.*

---

## 🧪 Testing Verification

### Backend Tests
```bash
cd backend
.\venv\Scripts\python.exe manage.py test
```
*Executes all 14 unit and integration tests covering authentication, authorization, AES-GCM crypto, AAD tamper detection, consent enforcement, and revocation.*

### Smart Contract Tests
```bash
cd contracts
npm test
```
*Executes Mocha/Chai contract tests verifying `MedicalRecordRegistry`, `AccessControlManager`, and `AuditLogger`.*

### Frontend Production Build Test
```bash
cd frontend
npm run build
```
*Runs TypeScript compilation and Turbopack production route generation.*

---

## ⚠️ Academic Disclaimers & Known Limitations

> [!WARNING]
> This repository is an **academic prototype and research demonstration**, not a HIPAA/GDPR-certified clinical production system.

1. **Cryptographic Model**: This prototype simulates Ciphertext-Policy Attribute-Based Encryption (CP-ABE) using server-side attribute evaluation combined with authenticated symmetric encryption (AES-256-GCM) and on-chain policy hashes. It does not implement full pairing-based cryptographic key delegation (e.g. BSW07) to the client browser.
2. **Key Custody**: The symmetric encryption keys are derived on the backend server from a master secret. The server remains in the trusted execution domain.
3. **Hardhat Test Keys**: The default development account (`0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`) uses a well-known public test private key. Never send real funds or deploy this private key to a live mainnet.
4. **Data Privacy**: Do not upload actual Protected Health Information (PHI) or real patient records to this local demonstration environment.
