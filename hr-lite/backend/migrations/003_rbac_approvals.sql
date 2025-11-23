-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'LEAVE_STATUS', 'LEAVE_REQUEST', 'PAYROLL_STATUS', etc.
    message TEXT NOT NULL,
    data_json TEXT DEFAULT '{}', -- Store related IDs e.g. { "leave_id": 1 }
    read BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Attendance Corrections table
CREATE TABLE IF NOT EXISTS attendance_corrections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    original_attendance_id INTEGER, -- Optional, if correcting existing record
    date DATE NOT NULL,
    old_clock_in DATETIME,
    old_clock_out DATETIME,
    new_clock_in DATETIME,
    new_clock_out DATETIME,
    reason TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    requested_by INTEGER NOT NULL, -- User ID
    approved_by INTEGER, -- User ID
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (requested_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Approvals Log table (Audit Trail)
CREATE TABLE IF NOT EXISTS approvals_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    entity_type TEXT NOT NULL, -- 'LEAVE', 'ATTENDANCE_CORRECTION', 'PAYROLL'
    entity_id INTEGER NOT NULL,
    action TEXT NOT NULL, -- 'APPROVE', 'REJECT', 'SUBMIT'
    performed_by INTEGER NOT NULL, -- User ID
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (performed_by) REFERENCES users(id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read) WHERE read = 0;
CREATE INDEX IF NOT EXISTS idx_attendance_corrections_status ON attendance_corrections(tenant_id, status);
