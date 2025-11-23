# Developer Onboarding

## Project Structure
- `backend/`: Node.js + Express API
- `frontend/`: React + Vite SPA
- `db.sqlite`: SQLite database (created after migration)

## Common Issues
- **Missing Tenant ID**: Ensure all queries include `tenant_id`.
- **Permission Errors**: Check `backend/logs` for details.
- **Migration Failures**: Delete `db.sqlite` and re-run `npm run migrate` if in dev.

## Contributing
See `CONTRIBUTING.md`.
