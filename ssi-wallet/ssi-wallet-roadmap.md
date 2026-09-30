# SSI Wallet Roadmap

## Current Support

The wallet already supports:

- OIDC4VCI receive flow with live authorize, token, and credential calls
- OIDC4VP present flow with live session, request document, and callback handling
- QR scanning and invite/payload entry for incoming issuer or verifier flows
- Local persistence of received credentials
- Local persistence of presentation history
- Home dashboard driven by stored wallet state
- Credential detail screens backed by stored wallet data
- Activity and history views backed by stored wallet data
- Empty states for first-run and no-data scenarios
- Backend metadata probing for issuer and verifier endpoints
- Error handling for failed protocol and storage operations

## Remaining Roadmap

### Phase 1: Wallet Hardening

- Secure onboarding
- Create or import wallet identity
- Biometric or PIN lock
- Encrypted credential and key storage
- Device binding
- Session timeout controls

### Phase 2: Trust and Verification UX

- Trust registry awareness in the wallet UI
- Revocation and status checking in the wallet UI
- Multiple credential grouping by issuer or category
- Search and filter credentials
- Mark favorites or pin important credentials
- Warning states for untrusted or expired credentials
- Accessibility and language improvements

### Phase 3: Recovery and Ecosystem

- Wallet backup and recovery flow
- Device migration
- Optional key-escrow recovery if the trust model allows it
- Multiple profiles or compartments
- Push notifications for credential updates or presentation requests
- Better diagnostics and support tooling

## Supported Wallet Flow

The wallet flow that works end to end today is:

1. Receive an issuance invite by QR, deep link, or pasted payload
2. Run the OIDC4VCI authorize and token exchange
3. Call the credential endpoint with the protocol access token
4. Store the received credential locally
5. Open the home dashboard or credential detail screen from stored data
6. Accept a verifier request for OIDC4VP
7. Fetch the request document
8. Post the presentation callback
9. Save the presentation outcome in local history

## Recommended Near-Term Work

If we want to keep momentum without overreaching, the next best additions are:

- encrypted local storage
- biometric or PIN unlock
- trust and revocation visibility
- search, filter, and grouping for stored credentials
- recovery and migration

## Notes

- The wallet is currently standards-first and holder-focused.
- The existing implementation is functional without mock data.
- Remaining work should preserve the same live protocol wiring and local persistence model.

