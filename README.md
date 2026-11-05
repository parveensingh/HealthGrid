# SecureChain local demo

This checkout originally contained a README and launch scripts, but no application source. The application in this repository is a newly created local demonstration inspired by the README, not a recovered copy of the original project.

## What this demo includes

- Django REST API with seeded demo doctors and sample attribute-based access policies.
- AES-256-GCM encryption of uploaded files at rest, with policy checks before decryption.
- Next.js patient, doctor, and admin portals.
- Local Hardhat Ethereum node and an on-chain audit logger.
- Optional IPFS Kubo HTTP API support for storing encrypted payloads.

## Important limitations

This is **not** a clinical or production system. It does not implement CP-ABE, user authentication, key separation from the backend, HIPAA/GDPR compliance, or a production blockchain. The demo's symmetric encryption key is derived from the Django `SECRET_KEY`; the backend can decrypt files. Demo doctor identities are selectable without signing in. The Hardhat node is local and disposable. Do not upload real patient or other sensitive data.

When Kubo is not configured, encrypted files are kept on the local filesystem. To use a local Kubo node, set `KUBO_API_URL=http://127.0.0.1:5001` in `backend\.env` and restart Django. IPFS will then store the encrypted payload; it does not provide CP-ABE.

## Requirements

- Windows 10/11
- Python 3.10 or newer
- Node.js 22.13 or newer and npm

## Install and run

1. Double-click `setup_and_install.bat`. It creates a Python virtual environment, installs dependencies, creates a local Django secret, migrates and seeds the database, and installs/compiles the frontend and contracts.
2. Double-click `start_all.bat`. It starts the local Hardhat node, deploys the audit contract, then opens the Django API and Next.js frontend in separate terminal windows.
3. Open <http://localhost:3000>. Use the Patient portal to upload a small sample document, then try the Doctor and Admin portals.

Service URLs:

- Web app: <http://localhost:3000>
- API health: <http://127.0.0.1:8001/api/health/>
- Local Ethereum JSON-RPC: <http://127.0.0.1:8545>

The start script uses the first default Hardhat development account. Its key is public test data and must never be reused on a real network.

## Tests

Run backend tests:

```powershell
cd backend
.\venv\Scripts\python.exe manage.py test
```

Run contract tests:

```powershell
cd contracts
npm test
```

Build the frontend:

```powershell
cd frontend
npm run build
```
