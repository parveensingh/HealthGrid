// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AuditLogger {
    struct Event {
        string recordId;
        string action;
        string actor;
        uint256 timestamp;
    }

    Event[] private events;

    event AuditRecorded(uint256 indexed eventId, string recordId, string action, string actor);

    function logEvent(string calldata recordId, string calldata action, string calldata actor) external {
        uint256 eventId = events.length;
        events.push(Event(recordId, action, actor, block.timestamp));
        emit AuditRecorded(eventId, recordId, action, actor);
    }

    function eventCount() external view returns (uint256) {
        return events.length;
    }

    function readEvent(uint256 eventId) external view returns (Event memory) {
        require(eventId < events.length, "event does not exist");
        return events[eventId];
    }
}
