import { readFile, writeFile } from "node:fs/promises";
import { network } from "hardhat";

const { ethers } = await network.create();
const contract = await ethers.deployContract("AuditLogger");
await contract.waitForDeployment();

const artifactPath = new URL("../artifacts/contracts/AuditLogger.sol/AuditLogger.json", import.meta.url);
const artifact = JSON.parse(await readFile(artifactPath, "utf8"));
const address = await contract.getAddress();
const deployment = { address, abi: artifact.abi };
const deploymentPath = new URL("../deployment.json", import.meta.url);
await writeFile(deploymentPath, JSON.stringify(deployment, null, 2));
console.log(`AuditLogger deployed at ${address}`);
