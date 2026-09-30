# Veridity Portal


## Environment

Copy `.env.example` to `.env`.

Important variables:

- `BACKEND_API_BASE_URL=http://localhost:4000/v1`
- `AUTH_MODE=mock`
- `CONTROL_PLANE_JWT_SECRET=dev-control-plane-secret`

## Notes

This is still a mock-auth portal foundation. It is now much safer and better aligned with the updated backend, but it is not yet the final production portal architecture.

Legacy `/tenant/*` pages still exist, but the portal now redirects users into the tenant-aware workspace where possible.