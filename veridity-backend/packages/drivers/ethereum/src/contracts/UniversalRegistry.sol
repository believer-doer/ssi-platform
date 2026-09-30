// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract UniversalRegistry {
    enum RecordStatus {
        Unknown,
        Pending,
        Active,
        Suspended,
        Revoked
    }

    enum GovernanceStatus {
        Unknown,
        Pending,
        Approved,
        Rejected,
        Executed,
        Cancelled
    }

    struct Issuer {
        RecordStatus status;
        string metadataURI;
        uint256 updatedAt;
    }

    struct Verifier {
        RecordStatus status;
        string metadataURI;
        uint256 updatedAt;
    }

    struct SchemaRecord {
        string uri;
        RecordStatus status;
        uint256 updatedAt;
    }

    struct TemplateRecord {
        string uri;
        RecordStatus status;
        uint256 updatedAt;
    }

    struct TrustRecord {
        string registryId;
        string entityType;
        string entityId;
        string did;
        string metadataURI;
        RecordStatus status;
        uint256 updatedAt;
    }

    struct GovernanceRecord {
        string issuerDid;
        string governanceType;
        string subjectType;
        string subjectId;
        uint256 requiredApprovals;
        uint256 approvalCount;
        GovernanceStatus status;
        string policyRef;
        string metadataURI;
        uint256 updatedAt;
    }

    struct StatusRootRecord {
        string listUri;
        string rootHash;
        uint256 updatedAt;
    }

    address public admin;

    mapping(string => Issuer) private issuers;
    mapping(string => Verifier) private verifiers;
    mapping(bytes32 => SchemaRecord) private schemas;
    mapping(bytes32 => TemplateRecord) private templates;
    mapping(bytes32 => TrustRecord) private trustRecords;
    mapping(bytes32 => GovernanceRecord) private governanceRecords;
    mapping(bytes32 => StatusRootRecord) private statusRoots;

    event IssuerUpserted(string did, string metadataURI, uint8 status);
    event IssuerStatusUpdated(string did, uint8 status);

    event IssuerRegistered(string did, string metadataURI);
    event IssuerRevoked(string did);

    event VerifierUpserted(string did, string metadataURI, uint8 status);
    event VerifierStatusUpdated(string did, uint8 status);
    event VerifierRegistered(string did, string metadataURI);
    event VerifierRevoked(string did);

    event SchemaUpserted(bytes32 schemaId, string uri, uint8 status);
    event SchemaStatusUpdated(bytes32 schemaId, uint8 status);
    event SchemaRegistered(bytes32 schemaId, string uri);
    event SchemaRevoked(bytes32 schemaId);

    event TemplateUpserted(bytes32 templateId, string uri, uint8 status);
    event TemplateStatusUpdated(bytes32 templateId, uint8 status);
    event TemplateRegistered(bytes32 templateId, string uri);
    event TemplateRevoked(bytes32 templateId);

    event TrustRecordUpserted(bytes32 recordId, string registryId, string entityType, string entityId, uint8 status);
    event TrustRecordStatusUpdated(bytes32 recordId, uint8 status);

    event GovernanceProposalUpserted(bytes32 proposalId, string subjectType, string subjectId, uint8 status);
    event GovernanceProposalApproved(bytes32 proposalId, uint256 approvalCount, uint8 status);

    event StatusRootUpserted(bytes32 statusListId, string rootHash);

    modifier onlyAdmin() {
        require(msg.sender == admin, "not admin");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function upsertIssuer(string calldata did, string calldata metadataURI, uint8 status) external onlyAdmin {
        require(_isValidRecordStatus(status), "invalid status");
        issuers[did] = Issuer({
            status: RecordStatus(status),
            metadataURI: metadataURI,
            updatedAt: block.timestamp
        });
        emit IssuerUpserted(did, metadataURI, status);
    }

    function setIssuerStatus(string calldata did, uint8 status) external onlyAdmin {
        require(_isValidRecordStatus(status), "invalid status");
        require(bytes(issuers[did].metadataURI).length > 0, "issuer not found");
        issuers[did].status = RecordStatus(status);
        issuers[did].updatedAt = block.timestamp;
        emit IssuerStatusUpdated(did, status);
    }

    function registerIssuer(string calldata did, string calldata metadataURI) external {
        require(msg.sender == admin || _isOwner(did, msg.sender), "not authorized");
        issuers[did] = Issuer({ status: RecordStatus.Active, metadataURI: metadataURI, updatedAt: block.timestamp });
        emit IssuerRegistered(did, metadataURI);
    }

    function revokeIssuer(string calldata did) external onlyAdmin {
        issuers[did].status = RecordStatus.Revoked;
        issuers[did].updatedAt = block.timestamp;
        emit IssuerRevoked(did);
    }

    function getIssuer(string calldata did) external view returns (uint8 status, string memory metadataURI, uint256 updatedAt) {
        Issuer memory issuer = issuers[did];
        return (uint8(issuer.status), issuer.metadataURI, issuer.updatedAt);
    }

    function upsertVerifier(string calldata did, string calldata metadataURI, uint8 status) external onlyAdmin {
        require(_isValidRecordStatus(status), "invalid status");
        verifiers[did] = Verifier({
            status: RecordStatus(status),
            metadataURI: metadataURI,
            updatedAt: block.timestamp
        });
        emit VerifierUpserted(did, metadataURI, status);
    }

    function setVerifierStatus(string calldata did, uint8 status) external onlyAdmin {
        require(_isValidRecordStatus(status), "invalid status");
        require(bytes(verifiers[did].metadataURI).length > 0, "verifier not found");
        verifiers[did].status = RecordStatus(status);
        verifiers[did].updatedAt = block.timestamp;
        emit VerifierStatusUpdated(did, status);
    }

    function registerVerifier(string calldata did, string calldata metadataURI) external onlyAdmin {
        verifiers[did] = Verifier({ status: RecordStatus.Active, metadataURI: metadataURI, updatedAt: block.timestamp });
        emit VerifierRegistered(did, metadataURI);
    }

    function revokeVerifier(string calldata did) external onlyAdmin {
        verifiers[did].status = RecordStatus.Revoked;
        verifiers[did].updatedAt = block.timestamp;
        emit VerifierRevoked(did);
    }

    function getVerifier(string calldata did) external view returns (uint8 status, string memory metadataURI, uint256 updatedAt) {
        Verifier memory verifier = verifiers[did];
        return (uint8(verifier.status), verifier.metadataURI, verifier.updatedAt);
    }

    function upsertSchema(bytes32 schemaId, string calldata uri, uint8 status) external onlyAdmin {
        require(_isValidRecordStatus(status), "invalid status");
        schemas[schemaId] = SchemaRecord({
            uri: uri,
            status: RecordStatus(status),
            updatedAt: block.timestamp
        });
        emit SchemaUpserted(schemaId, uri, status);
    }

    function setSchemaStatus(bytes32 schemaId, uint8 status) external onlyAdmin {
        require(_isValidRecordStatus(status), "invalid status");
        require(bytes(schemas[schemaId].uri).length > 0, "schema not found");
        schemas[schemaId].status = RecordStatus(status);
        schemas[schemaId].updatedAt = block.timestamp;
        emit SchemaStatusUpdated(schemaId, status);
    }

    function registerSchema(bytes32 schemaId, string calldata uri) external onlyAdmin {
        schemas[schemaId] = SchemaRecord({ uri: uri, status: RecordStatus.Active, updatedAt: block.timestamp });
        emit SchemaRegistered(schemaId, uri);
    }

    function revokeSchema(bytes32 schemaId) external onlyAdmin {
        schemas[schemaId].status = RecordStatus.Revoked;
        schemas[schemaId].updatedAt = block.timestamp;
        emit SchemaRevoked(schemaId);
    }

    function getSchema(bytes32 schemaId) external view returns (string memory uri, uint8 status, uint256 updatedAt) {
        SchemaRecord memory schema = schemas[schemaId];
        return (schema.uri, uint8(schema.status), schema.updatedAt);
    }

    function upsertTemplate(bytes32 templateId, string calldata uri, uint8 status) external onlyAdmin {
        require(_isValidRecordStatus(status), "invalid status");
        templates[templateId] = TemplateRecord({
            uri: uri,
            status: RecordStatus(status),
            updatedAt: block.timestamp
        });
        emit TemplateUpserted(templateId, uri, status);
    }

    function setTemplateStatus(bytes32 templateId, uint8 status) external onlyAdmin {
        require(_isValidRecordStatus(status), "invalid status");
        require(bytes(templates[templateId].uri).length > 0, "template not found");
        templates[templateId].status = RecordStatus(status);
        templates[templateId].updatedAt = block.timestamp;
        emit TemplateStatusUpdated(templateId, status);
    }

    function registerTemplate(bytes32 templateId, string calldata uri) external onlyAdmin {
        templates[templateId] = TemplateRecord({ uri: uri, status: RecordStatus.Active, updatedAt: block.timestamp });
        emit TemplateRegistered(templateId, uri);
    }

    function revokeTemplate(bytes32 templateId) external onlyAdmin {
        templates[templateId].status = RecordStatus.Revoked;
        templates[templateId].updatedAt = block.timestamp;
        emit TemplateRevoked(templateId);
    }

    function getTemplate(bytes32 templateId) external view returns (string memory uri, uint8 status, uint256 updatedAt) {
        TemplateRecord memory template = templates[templateId];
        return (template.uri, uint8(template.status), template.updatedAt);
    }

    function upsertTrustRecord(
        bytes32 recordId,
        string calldata registryId,
        string calldata entityType,
        string calldata entityId,
        string calldata did,
        string calldata metadataURI,
        uint8 status
    ) external onlyAdmin {
        require(_isValidRecordStatus(status), "invalid status");
        trustRecords[recordId] = TrustRecord({
            registryId: registryId,
            entityType: entityType,
            entityId: entityId,
            did: did,
            metadataURI: metadataURI,
            status: RecordStatus(status),
            updatedAt: block.timestamp
        });
        emit TrustRecordUpserted(recordId, registryId, entityType, entityId, status);
    }

    function setTrustRecordStatus(bytes32 recordId, uint8 status) external onlyAdmin {
        require(_isValidRecordStatus(status), "invalid status");
        require(bytes(trustRecords[recordId].entityId).length > 0, "trust record not found");
        trustRecords[recordId].status = RecordStatus(status);
        trustRecords[recordId].updatedAt = block.timestamp;
        emit TrustRecordStatusUpdated(recordId, status);
    }

    function getTrustRecord(bytes32 recordId)
        external
        view
        returns (
            string memory registryId,
            string memory entityType,
            string memory entityId,
            string memory did,
            string memory metadataURI,
            uint8 status,
            uint256 updatedAt
        )
    {
        TrustRecord memory record = trustRecords[recordId];
        return (
            record.registryId,
            record.entityType,
            record.entityId,
            record.did,
            record.metadataURI,
            uint8(record.status),
            record.updatedAt
        );
    }

    function upsertGovernanceProposal(
        bytes32 proposalId,
        string calldata issuerDid,
        string calldata governanceType,
        string calldata subjectType,
        string calldata subjectId,
        uint256 requiredApprovals,
        uint8 status,
        string calldata policyRef,
        string calldata metadataURI
    ) external onlyAdmin {
        require(_isValidGovernanceStatus(status), "invalid governance status");
        governanceRecords[proposalId] = GovernanceRecord({
            issuerDid: issuerDid,
            governanceType: governanceType,
            subjectType: subjectType,
            subjectId: subjectId,
            requiredApprovals: requiredApprovals,
            approvalCount: governanceRecords[proposalId].approvalCount,
            status: GovernanceStatus(status),
            policyRef: policyRef,
            metadataURI: metadataURI,
            updatedAt: block.timestamp
        });
        emit GovernanceProposalUpserted(proposalId, subjectType, subjectId, status);
    }

    function approveGovernanceProposal(bytes32 proposalId) external onlyAdmin {
        GovernanceRecord storage proposal = governanceRecords[proposalId];
        require(bytes(proposal.subjectId).length > 0, "proposal not found");

        proposal.approvalCount += 1;
        if (proposal.approvalCount >= proposal.requiredApprovals) {
            proposal.status = GovernanceStatus.Approved;
        }
        proposal.updatedAt = block.timestamp;

        emit GovernanceProposalApproved(proposalId, proposal.approvalCount, uint8(proposal.status));
    }

    function getGovernanceProposal(bytes32 proposalId)
        external
        view
        returns (
            string memory issuerDid,
            string memory governanceType,
            string memory subjectType,
            string memory subjectId,
            uint256 requiredApprovals,
            uint256 approvalCount,
            uint8 status,
            string memory policyRef,
            string memory metadataURI,
            uint256 updatedAt
        )
    {
        GovernanceRecord memory proposal = governanceRecords[proposalId];
        return (
            proposal.issuerDid,
            proposal.governanceType,
            proposal.subjectType,
            proposal.subjectId,
            proposal.requiredApprovals,
            proposal.approvalCount,
            uint8(proposal.status),
            proposal.policyRef,
            proposal.metadataURI,
            proposal.updatedAt
        );
    }

    function upsertStatusRoot(bytes32 statusListId, string calldata listUri, string calldata rootHash) external onlyAdmin {
        statusRoots[statusListId] = StatusRootRecord({
            listUri: listUri,
            rootHash: rootHash,
            updatedAt: block.timestamp
        });
        emit StatusRootUpserted(statusListId, rootHash);
    }

    function getStatusRoot(bytes32 statusListId)
        external
        view
        returns (string memory listUri, string memory rootHash, uint256 updatedAt)
    {
        StatusRootRecord memory statusRoot = statusRoots[statusListId];
        return (statusRoot.listUri, statusRoot.rootHash, statusRoot.updatedAt);
    }

    function _isValidRecordStatus(uint8 status) internal pure returns (bool) {
        return status <= uint8(RecordStatus.Revoked);
    }

    function _isValidGovernanceStatus(uint8 status) internal pure returns (bool) {
        return status <= uint8(GovernanceStatus.Cancelled);
    }

    function _isOwner(string memory did, address sender) internal pure returns (bool) {
        bytes memory value = bytes(did);

        if (_startsWith(did, "did:ethr:")) {
            return _addressEquals(_substring(value, 9), sender);
        }

        if (_startsWith(did, "did:pkh:eip155:")) {
            uint256 colonIndex = _lastIndexOf(value, ":");
            if (colonIndex == 0 || colonIndex + 1 >= value.length) {
                return false;
            }
            return _addressEquals(_substring(value, colonIndex + 1), sender);
        }

        return false;
    }

    function _startsWith(string memory value, string memory prefix) internal pure returns (bool) {
        bytes memory valueBytes = bytes(value);
        bytes memory prefixBytes = bytes(prefix);

        if (prefixBytes.length > valueBytes.length) {
            return false;
        }

        for (uint256 i = 0; i < prefixBytes.length; i++) {
            if (valueBytes[i] != prefixBytes[i]) {
                return false;
            }
        }

        return true;
    }

    function _lastIndexOf(bytes memory value, string memory needle) internal pure returns (uint256) {
        bytes1 target = bytes(needle)[0];

        for (uint256 i = value.length; i > 0; i--) {
            if (value[i - 1] == target) {
                return i - 1;
            }
        }

        return 0;
    }

    function _substring(bytes memory value, uint256 start) internal pure returns (string memory) {
        bytes memory result = new bytes(value.length - start);

        for (uint256 i = start; i < value.length; i++) {
            result[i - start] = value[i];
        }

        return string(result);
    }

    function _addressEquals(string memory candidate, address sender) internal pure returns (bool) {
        return keccak256(bytes(_toLower(candidate))) == keccak256(bytes(_toLower(_toHexString(sender))));
    }

    function _toLower(string memory value) internal pure returns (string memory) {
        bytes memory buffer = bytes(value);

        for (uint256 i = 0; i < buffer.length; i++) {
            uint8 charCode = uint8(buffer[i]);
            if (charCode >= 65 && charCode <= 90) {
                buffer[i] = bytes1(charCode + 32);
            }
        }

        return string(buffer);
    }

    function _toHexString(address account) internal pure returns (string memory) {
        bytes20 value = bytes20(account);
        bytes16 alphabet = 0x30313233343536373839616263646566;
        bytes memory result = new bytes(42);
        result[0] = "0";
        result[1] = "x";

        for (uint256 i = 0; i < 20; i++) {
            result[2 + i * 2] = alphabet[uint8(value[i] >> 4)];
            result[3 + i * 2] = alphabet[uint8(value[i] & 0x0f)];
        }

        return string(result);
    }
}
