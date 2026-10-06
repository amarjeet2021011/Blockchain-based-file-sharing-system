// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

/// @title Upload
/// @notice Stores IPFS file references per user and lets owners grant or
///         revoke read access to other addresses.
/// @dev Everything stored on-chain is publicly readable. Access control here
///      only governs what `display` returns through the contract interface.
contract Upload {
    struct Access {
        address user;
        bool access;
    }

    struct FileInfo {
        string url;
        string fileType;
        string fileName;
        uint256 uploadedAt;
    }

    mapping(address => FileInfo[]) private files;
    mapping(address => mapping(address => bool)) private ownership;
    mapping(address => Access[]) private accessList;
    // owner => user => index in accessList[owner] + 1 (0 means "never added")
    mapping(address => mapping(address => uint256)) private accessIndex;
    // user => owners that have ever granted access to user
    mapping(address => address[]) private grantors;

    event FileAdded(address indexed owner, uint256 indexed index, string url, string fileName);
    event AccessGranted(address indexed owner, address indexed user);
    event AccessRevoked(address indexed owner, address indexed user);

    function add(
        string calldata url,
        string calldata fileType,
        string calldata fileName
    ) external {
        require(bytes(url).length > 0, "URL required");
        files[msg.sender].push(FileInfo(url, fileType, fileName, block.timestamp));
        emit FileAdded(msg.sender, files[msg.sender].length - 1, url, fileName);
    }

    function allow(address user) external {
        require(user != address(0), "Invalid address");
        require(user != msg.sender, "Cannot share with yourself");
        require(!ownership[msg.sender][user], "Already has access");

        ownership[msg.sender][user] = true;
        uint256 idx = accessIndex[msg.sender][user];
        if (idx == 0) {
            accessList[msg.sender].push(Access(user, true));
            accessIndex[msg.sender][user] = accessList[msg.sender].length;
            grantors[user].push(msg.sender);
        } else {
            accessList[msg.sender][idx - 1].access = true;
        }
        emit AccessGranted(msg.sender, user);
    }

    function disallow(address user) external {
        require(ownership[msg.sender][user], "User has no access");
        ownership[msg.sender][user] = false;
        accessList[msg.sender][accessIndex[msg.sender][user] - 1].access = false;
        emit AccessRevoked(msg.sender, user);
    }

    function display(address user) external view returns (FileInfo[] memory) {
        require(user == msg.sender || ownership[user][msg.sender], "You don't have access");
        return files[user];
    }

    function hasAccess(address owner, address user) external view returns (bool) {
        return owner == user || ownership[owner][user];
    }

    /// @notice Addresses the caller has shared with (including revoked entries).
    function shareAccess() external view returns (Access[] memory) {
        return accessList[msg.sender];
    }

    /// @notice Owners that currently grant the caller access to their files.
    function sharedWithMe() external view returns (address[] memory) {
        address[] storage all = grantors[msg.sender];
        uint256 count;
        for (uint256 i = 0; i < all.length; i++) {
            if (ownership[all[i]][msg.sender]) count++;
        }
        address[] memory result = new address[](count);
        uint256 j;
        for (uint256 i = 0; i < all.length; i++) {
            if (ownership[all[i]][msg.sender]) result[j++] = all[i];
        }
        return result;
    }
}
