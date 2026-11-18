import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("HealthGrid Smart Contracts", function () {
  let patient, clinician, other;
  let registry, accessManager, auditLogger;

  beforeEach(async function () {
    [patient, clinician, other] = await ethers.getSigners();
    registry = await ethers.deployContract("MedicalRecordRegistry");
    accessManager = await ethers.deployContract("AccessControlManager");
    auditLogger = await ethers.deployContract("AuditLogger");
  });

  describe("MedicalRecordRegistry", function () {
    it("registers and revokes a record by its patient", async function () {
      const recordId = ethers.keccak256(ethers.toUtf8Bytes("record-1"));
      const cid = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";
      const policyHash = ethers.keccak256(ethers.toUtf8Bytes("Role:Doctor AND Dept:Cardiology"));

      await expect(registry.connect(patient).registerRecord(recordId, cid, policyHash))
        .to.emit(registry, "RecordRegistered")
        .withArgs(recordId, patient.address, cid, policyHash);

      const record = await registry.getRecord(recordId);
      expect(record.patient).to.equal(patient.address);
      expect(record.cid).to.equal(cid);
      expect(record.policyHash).to.equal(policyHash);
      expect(record.revoked).to.equal(false);
      expect(record.exists).to.equal(true);

      // Duplicate registration must fail
      await expect(
        registry.connect(patient).registerRecord(recordId, cid, policyHash)
      ).to.be.revertedWith("record already exists");

      // Non-owner cannot revoke
      await expect(
        registry.connect(other).revokeRecord(recordId)
      ).to.be.revertedWith("only patient can revoke");

      // Patient revokes record
      await expect(registry.connect(patient).revokeRecord(recordId))
        .to.emit(registry, "RecordRevoked")
        .withArgs(recordId);

      expect((await registry.getRecord(recordId)).revoked).to.equal(true);

      // Cannot revoke again
      await expect(
        registry.connect(patient).revokeRecord(recordId)
      ).to.be.revertedWith("record already revoked");
    });
  });

  describe("AccessControlManager", function () {
    it("enforces patient ownership and access control grants", async function () {
      const recordId = ethers.keccak256(ethers.toUtf8Bytes("record-2"));

      await accessManager.connect(patient).registerRecord(recordId);
      expect(await accessManager.recordOwner(recordId)).to.equal(patient.address);

      // Duplicate registration rejected
      await expect(
        accessManager.connect(other).registerRecord(recordId)
      ).to.be.revertedWith("record already registered");

      // Non-owner cannot grant access
      await expect(
        accessManager.connect(other).grantAccess(recordId, clinician.address)
      ).to.be.revertedWith("only patient can grant access");

      // Patient grants access
      await expect(accessManager.connect(patient).grantAccess(recordId, clinician.address))
        .to.emit(accessManager, "AccessChanged")
        .withArgs(recordId, clinician.address, true);
      expect(await accessManager.accessGranted(recordId, clinician.address)).to.equal(true);

      // Patient revokes access
      await expect(accessManager.connect(patient).revokeAccess(recordId, clinician.address))
        .to.emit(accessManager, "AccessChanged")
        .withArgs(recordId, clinician.address, false);
      expect(await accessManager.accessGranted(recordId, clinician.address)).to.equal(false);

      // Patient revokes the entire record
      await accessManager.connect(patient).revokeRecord(recordId);
      expect(await accessManager.recordRevoked(recordId)).to.equal(true);

      // Emergency access is denied on revoked records
      await expect(
        accessManager.connect(clinician).useEmergencyAccess(recordId)
      ).to.be.revertedWith("record revoked");
    });
  });

  describe("AuditLogger", function () {
    it("records immutable audit events with timestamps", async function () {
      await expect(auditLogger.logEvent("record-1", "uploaded", "Alice (Patient)"))
        .to.emit(auditLogger, "AuditRecorded")
        .withArgs(0n, "record-1", "uploaded", "Alice (Patient)");

      await auditLogger.logEvent("record-1", "access_granted", "Dr. Rajesh");
      expect(await auditLogger.eventCount()).to.equal(2n);

      const event0 = await auditLogger.readEvent(0);
      expect(event0.recordId).to.equal("record-1");
      expect(event0.action).to.equal("uploaded");
      expect(event0.actor).to.equal("Alice (Patient)");
      expect(event0.timestamp).to.be.greaterThan(0n);

      const event1 = await auditLogger.readEvent(1);
      expect(event1.action).to.equal("access_granted");
      expect(event1.actor).to.equal("Dr. Rajesh");
    });
  });
});
