# HR Lite Multi-Tenant

A production-quality, maintainable HR web application for small–medium companies.

## Features
- **Core HR**: Employee profiles, org structure, document upload.
- **Attendance**: Clock-in/out, manual correction, monthly export.
- **Leave Management**: Request, approve/reject, balance.
- **Basic Payroll**: Manual salary entries, HTML payslip download.
- **Auth & Roles**: JWT-based auth with roles (ADMIN, HR, MANAGER, EMPLOYEE).
- **Multi-tenancy**: Data isolation per tenant.

## Setup

1.  **Install Dependencies**
    ```bash
    cd backend
    npm install
    cd ../frontend
    npm install
    ```

2.  **Environment Variables**
    Copy `.env.example` to `.env` in the root or backend folder (depending on how you run it).
    ```bash
    cp .env.example backend/.env
    ```

3.  **Database Setup**
    Initialize the database and run migrations:
    ```bash
    cd backend
    npm run migrate
    npm run seed
    ```

4.  **Run Application**
    *   Backend:
        ```bash
        cd backend
        npm start
        ```
    *   Frontend:
        ```bash
        cd frontend
        npm run dev
        ```

## Testing
Run backend tests:
```bash
cd backend
npm test
```

## Debugging
- **Admin Dashboard**: Go to `/admin/errors` to view logged errors.
- **Export Debug**: Go to `/admin/export-debug.zip` to download the database and logs.

## Feature Flags
Enable/disable premium features in `feature-flags.json`.
