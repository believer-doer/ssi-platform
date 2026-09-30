# Veridity Wallet

Phase 1 holder wallet MVP for the Veridity SSI platform.

## What this project is

A React Native app that focuses on the holder side of SSI:

- secure onboarding
- receive credentials by QR or deep link
- store credentials on device
- present credentials with consent
- review activity history
- manage security and recovery settings

## Architecture

- Framework: Expo + React Native
- Routing: `expo-router`
- Storage and security:
  - `expo-secure-store`
  - `expo-local-authentication`
  - local storage abstraction for wallet payloads
- Scan flow: `expo-camera`

## Phase 1 scope

- Home dashboard
- Receive credential flow
- Present credential flow
- Credential detail screen
- Activity history
- Settings / security / recovery

## Suggested next steps

1. Wire the receive flow to the backend issuer endpoints.
2. Add encrypted persistence for credentials and keys.
3. Add biometric unlock and device binding.
4. Connect presentation requests to the verifier protocol endpoints.
5. Add push notifications for issuance, expiry, and presentation requests.

## Setup

Install dependencies and start the app:

```bash
pnpm install
pnpm start
```

## Environment

The wallet reads local Expo environment values from `ssi-wallet/.env.local`.

Start by keeping these defaults for local development:

```env
EXPO_PUBLIC_BACKEND_ORIGIN=http://localhost:4000
EXPO_PUBLIC_BACKEND_API_BASE_URL=http://localhost:4000/v1
EXPO_PUBLIC_BACKEND_DRIVER=internal
```

If you want to change them, edit `.env.local` and keep `.env.example` as the reference.

Run on platforms:

```bash
pnpm ios
pnpm android
```
