# Admin Pages

Canonical documentation for admin UI pages in the main app.

## Routes

- `/admin`: admin dashboard entry page.
- `/admin/users`: admin user management page.

## Access Model

- Admin pages check permissions through `useAdminPermissions`.
- Non-admin users are redirected away from admin-only routes.
- Route wiring is in `src/ui/routes/PlatformAwareRoutes.tsx`.

## Main Files

- `src/ui/pages/admin/AdminUsersPage.tsx`
- `src/hooks/useAdminPermissions.ts`

## Scope

- This is UI and client routing documentation only.
- Backend admin APIs, policy, and data ownership are documented with their owning runtime.
