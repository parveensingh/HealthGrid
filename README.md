# SecureChain: Decentralized Access Control for Medical Reports Using Smart Contracts and Attribute-Based Encryption

[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-blue.svg)](https://soliditylang.org/)
[![Django](https://img.shields.io/badge/Django-5.1-green.svg)](https://www.djangoproject.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![IPFS](https://img.shields.io/badge/IPFS-Off--Chain%20Vault-cyan.svg)](https://ipfs.tech/)
[![CP-ABE](https://img.shields.io/badge/Cryptography-CP--ABE%20%2B%20AES--256-teal.svg)](#cryptography)

An enterprise-grade, real-world implementation of the **8th Semester Capstone Engineering Project** based on the research paper:  
> **"Decentralized Access Control for Medical Reports Using Smart Contracts and Attribute-Based Encryption"**

---

## 1. System Architecture

```
                      ┌──────────────────────────────────────────────┐
                      │             NEXT.JS 14 FRONTEND              │
                      │  - Patient Portal (Policy Builder & Revoke)  │
                      │  - Doctor Portal (Decryption & PDF Viewer)   │
                      │  - Hospital Admin (KYC & Attribute Mgmt)     │
                      └──────────────┬───────────────────────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 │ Web3 (MetaMask / Ethers.js)           │ REST APIs (JSON)
                 ▼                                       ▼
  ┌───────────────────────────────┐     ┌───────────────────────────────────┐
  │     BLOCKCHAIN LAYER          │     │          DJANGO BACKEND           │
  │     (Ethereum / Hardhat)      │     │    (Django REST Framework)        │
  │  - MedicalRegistry.sol        │     │  - Attribute Authority (AA)       │
  │  - AccessControlManager.sol   │◄────┤  - CP-ABE + AES-256 Hybrid Crypto │
  │  - AuditLogger.sol            │Web3 ├─────────────────┬─────────────────┘
  └───────────────────────────────┘     │                 │
                                        │                 ▼
                                        │     ┌───────────────────────┐
                                        │     │     IPFS STORAGE      │
                                        └────►│  (Encrypted Payloads) │
                                              └───────────────────────┘
```

---

## 2. Key Modules Implemented

1. **Smart Contracts (`contracts/`)**:
   - `MedicalRecordRegistry.sol`: Decentralized registry binding record IDs to IPFS CIDs, patient owners, and policy hashes.
   - `AccessControlManager.sol`: Role-based access validation, dynamic on-chain revocation ($\le 0.5\text{s}$), and Break-Glass emergency override.
   - `AuditLogger.sol`: Immutable HIPAA/GDPR audit ledger recording every registration, access attempt, and revocation.

2. **Attribute Authority & Cryptographic Engine (`backend/`)**:
   - **CP-ABE Hybrid Encryption**: Encrypts raw files using **AES-256-GCM** and encrypts the symmetric key using **Ciphertext-Policy Attribute-Based Encryption**.
   - **KeyGen Service**: Generates collusion-resistant secret key components for clinicians based on their verified medical attributes (e.g. `Role:Doctor`, `Dept:Cardiology`).
   - **IPFS Vault Service**: Zero-knowledge off-chain decentralized storage with deterministic cryptographic CID calculation (and Pinata Cloud support).

3. **Modern Web Portals (`frontend/`)**:
   - **Patient Portal** (`/patient`): File dropzone, visual Boolean policy builder, real-time revocation toggles, and patient audit feed.
   - **Doctor Portal** (`/doctor`): Identity card, patient record directory, real-time CP-ABE decryption viewer, and Break-Glass emergency mode.
   - **Hospital Admin Portal** (`/admin`): Doctor KYC verification, CP-ABE key generation, and system-wide HIPAA audit table.

---

## 3. Quick Start Guide (Ready for Anyone to Use)

### For Fresh Computers / Classmates / Evaluators:
1. **First-Time Setup (Automated)**:
   - Double-click [`setup_and_install.bat`](file:///c:/Users/nabee/Downloads/asad%20bhai/setup_and_install.bat).
   - This automatically checks for Python & Node.js (and installs them if missing), configures the Python virtual environment, compiles the Solidity contracts, applies database migrations, seeds the database, and installs all Next.js dependencies.

2. **Run Everything**:
   - Double-click [`start_all.bat`](file:///c:/Users/nabee/Downloads/asad%20bhai/start_all.bat).
   - Both the Django REST API (`http://127.0.0.1:8000`) and the Next.js Web App (`http://localhost:3000`) will launch automatically in their own terminal windows.

### Or Run Manually:

#### 1. Backend (Django):
```bash
cd backend
..\backend\venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

#### 2. Frontend (Next.js):
```bash
cd frontend
npm run dev
```
Open **http://localhost:3000** in your browser.

#### 3. Smart Contracts (Hardhat Node & Tests):
```bash
cd contracts
npx hardhat test      # Runs automated contract test suite
npx hardhat node      # Starts local Ethereum node
```

---

## 4. Live Viva / Defense Demonstration Flow (3 Minutes)

1. **Step 1: Patient Uploads Report**
   - Open **http://localhost:3000/patient**.
   - Select a sample report (e.g., Cardiac Echo PDF).
   - Use the **Visual Policy Builder** to set the policy: `(Role:Doctor AND Dept:Cardiology) OR Emergency:True`.
   - Click **Encrypt & Pin to IPFS**. Notice the generated IPFS CID and instant encryption.

2. **Step 2: Authorized Doctor Decrypts Report**
   - Open **http://localhost:3000/doctor**.
   - Select **Dr. Sarah Jenkins** (Cardiologist). Her attributes match the policy.
   - Click **Decrypt & View**. The report opens immediately in the secure in-browser PDF viewer.

3. **Step 3: Unauthorized Access Rejection**
   - In the Doctor Portal, switch to **Dr. Marcus Vance** (Dermatologist).
   - Attempt to decrypt the Cardiology record.
   - The system **mathematically rejects decryption** and logs an unauthorized access attempt to the HIPAA audit ledger.

4. **Step 4: Dynamic Revocation in < 0.5s**
   - Go back to the **Patient Portal** and click **Revoke Access** on the record.
   - Return to Doctor Portal. Even authorized doctors are now locked out immediately without central IT intervention.

---

## 5. Comparison with Existing Systems (Paper Table II)

| Feature | SecureChain (Ours) | MedRec | FHIRChain |
| :--- | :--- | :--- | :--- |
| **Decentralization** | **Full** | Partial | Full |
| **Access Granularity** | **Fine-Grained (CP-ABE)** | Coarse | Medium |
| **Encryption** | **CP-ABE + AES-256** | Symmetric | Public Key |
| **Revocation Speed** | **< 0.5s** | 2.0s | 1.5s |
| **Audit Integrity** | **Ethereum Immutability** | Database | Consortium |
| **HIPAA Compliance** | **Full** | Partial | Full |
