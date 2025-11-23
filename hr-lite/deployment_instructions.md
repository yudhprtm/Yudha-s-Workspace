# Deployment Instructions

## Antigravity / Replit

1.  **Prerequisites**
    - Ensure `feature-flags.json` is configured correctly.
    - Ensure `.env` is set up with a strong `JWT_SECRET`.

2.  **Build**
    - Frontend: `cd frontend && npm run build`
    - Copy `frontend/dist` to `backend/public` (or configure backend to serve it).

3.  **Run**
    - Start the backend process: `node backend/app.js`
    - The backend should serve the static frontend files and the API.

## Docker (Optional)
(Add Dockerfile instructions if needed)
