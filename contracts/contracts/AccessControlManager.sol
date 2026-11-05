// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AccessControlManager {
    mapping(bytes32 => mapping(address => bool)) public accessGranted;
    mapping(bytes32 => bool) public recordRevoked;
    mapping(bytes32 => address) public recordOwner;

    event AccessChanged(bytes32 indexed recordId, address indexed clinician, bool granted);
    event EmergencyAccess(bytes32 indexed recordId, address indexed clinician);

    function registerRecord(bytes32 recordId) external {
        require(recordOwner[recordId] == address(0), "record already registered");
        recordOwner[recordId] = msg.sender;
    }

    function grantAccess(bytes32 recordId, address clinician) external {
        require(recordOwner[recordId] == msg.sender, "only patient can grant access");
        require(!recordRevoked[recordId], "record revoked");
        accessGranted[recordId][clinician] = true;
        emit AccessChanged(recordId, clinician, true);
    }

    function revokeAccess(bytes32 recordId, address clinician) external {
        require(recordOwner[recordId] == msg.sender, "only patient can revoke access");
        accessGranted[recordId][clinician] = false;
        emit AccessChanged(recordId, clinician, false);
    }

    function revokeRecord(bytes32 recordId) external {
        require(recordOwner[recordId] == msg.sender, "only patient can revoke record");
        recordRevoked[recordId] = true;
        emit AccessChanged(recordId, address(0), false);
    }

    function useEmergencyAccess(bytes32 recordId) external {
        require(recordOwner[recordId] != address(0), "record does not exist");
        require(!recordRevoked[recordId], "record revoked");
        emit EmergencyAccess(recordId, msg.sender);
    }
}
