import { readFile, writeFile } from "node:fs/promises";
import { network } from "hardhat";

const { ethers } = await network.create();

console.log("Deploying HealthGrid Smart Contracts to network:", network.name);

// 1. Deploy AuditLogger
const auditLoggerContract = await ethers.deployContract("AuditLogger");
await auditLoggerContract.waitForDeployment();
const auditLoggerAddress = await auditLoggerContract.getAddress();
const auditArtifactPath = new URL("../artifacts/contracts/AuditLogger.sol/AuditLogger.json", import.meta.url);
const auditArtifact = JSON.parse(await readFile(auditArtifactPath, "utf8"));
console.log(`[1/3] AuditLogger deployed at: ${auditLoggerAddress}`);

// 2. Deploy MedicalRecordRegistry
const registryContract = await ethers.deployContract("MedicalRecordRegistry");
await registryContract.waitForDeployment();
const registryAddress = await registryContract.getAddress();
const registryArtifactPath = new URL("../artifacts/contracts/MedicalRecordRegistry.sol/MedicalRecordRegistry.json", import.meta.url);
const registryArtifact = JSON.parse(await readFile(registryArtifactPath, "utf8"));
console.log(`[2/3] MedicalRecordRegistry deployed at: ${registryAddress}`);

// 3. Deploy AccessControlManager
const accessControlContract = await ethers.deployContract("AccessControlManager");
await accessControlContract.waitForDeployment();
const accessControlAddress = await accessControlContract.getAddress();
const accessArtifactPath = new URL("../artifacts/contracts/AccessControlManager.sol/AccessControlManager.json", import.meta.url);
const accessArtifact = JSON.parse(await readFile(accessArtifactPath, "utf8"));
console.log(`[3/3] AccessControlManager deployed at: ${accessControlAddress}`);

// Generate multi-contract deployment manifest with backward-compatible top-level keys
const deployment = {
  AuditLogger: { address: auditLoggerAddress, abi: auditArtifact.abi },
  MedicalRecordRegistry: { address: registryAddress, abi: registryArtifact.abi },
  AccessControlManager: { address: accessControlAddress, abi: accessArtifact.abi },
  // Backward compatibility aliases
  address: auditLoggerAddress,
  abi: auditArtifact.abi,
  deployedAt: new Date().toISOString(),
  network: network.name,
};

const deploymentPath = new URL("../deployment.json", import.meta.url);
await writeFile(deploymentPath, JSON.stringify(deployment, null, 2));
console.log(`Deployment manifest written to ${deploymentPath.pathname}`);
