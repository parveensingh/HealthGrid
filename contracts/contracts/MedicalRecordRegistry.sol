// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MedicalRecordRegistry {
    struct Record {
        address patient;
        string cid;
        bytes32 policyHash;
        bool revoked;
        bool exists;
    }

    mapping(bytes32 => Record) private records;

    event RecordRegistered(bytes32 indexed recordId, address indexed patient, string cid, bytes32 policyHash);
    event RecordRevoked(bytes32 indexed recordId);

    function registerRecord(bytes32 recordId, string calldata cid, bytes32 policyHash) external {
        require(!records[recordId].exists, "record already exists");
        records[recordId] = Record(msg.sender, cid, policyHash, false, true);
        emit RecordRegistered(recordId, msg.sender, cid, policyHash);
    }

    function revokeRecord(bytes32 recordId) external {
        Record storage record = records[recordId];
        require(record.exists, "record does not exist");
        require(record.patient == msg.sender, "only patient can revoke");
        require(!record.revoked, "record already revoked");
        record.revoked = true;
        emit RecordRevoked(recordId);
    }

    function getRecord(bytes32 recordId) external view returns (Record memory) {
        require(records[recordId].exists, "record does not exist");
        return records[recordId];
    }
}
