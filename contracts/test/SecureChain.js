import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("SecureChain contracts", function () {
  it("registers and revokes a record by its patient", async function () {
    const [patient, other] = await ethers.getSigners();
    const registry = await ethers.deployContract("MedicalRecordRegistry");
    const recordId = ethers.keccak256(ethers.toUtf8Bytes("record-1"));

    await expect(registry.registerRecord(recordId, "bafy-demo", ethers.keccak256(ethers.toUtf8Bytes("policy"))))
      .to.emit(registry, "RecordRegistered");
    await expect(registry.connect(other).revokeRecord(recordId)).to.be.revertedWith("only patient can revoke");
    await expect(registry.revokeRecord(recordId)).to.emit(registry, "RecordRevoked");
    expect((await registry.getRecord(recordId)).revoked).to.equal(true);
    expect(patient.address).to.equal((await registry.getRecord(recordId)).patient);
  });

  it("writes audit events", async function () {
    const logger = await ethers.deployContract("AuditLogger");
    await logger.logEvent("record-1", "uploaded", "Demo Patient");
    expect(await logger.eventCount()).to.equal(1n);
    expect((await logger.readEvent(0)).action).to.equal("uploaded");
  });

  it("restricts access changes and emergency access respects revocation", async function () {
    const [patient, clinician, other] = await ethers.getSigners();
    const manager = await ethers.deployContract("AccessControlManager");
    const recordId = ethers.keccak256(ethers.toUtf8Bytes("record-2"));

    await manager.registerRecord(recordId);
    await expect(manager.connect(other).grantAccess(recordId, clinician.address))
      .to.be.revertedWith("only patient can grant access");
    await manager.grantAccess(recordId, clinician.address);
    expect(await manager.accessGranted(recordId, clinician.address)).to.equal(true);
    await manager.revokeRecord(recordId);
    await expect(manager.connect(clinician).useEmergencyAccess(recordId))
      .to.be.revertedWith("record revoked");
    expect(await manager.recordOwner(recordId)).to.equal(patient.address);
  });
});
