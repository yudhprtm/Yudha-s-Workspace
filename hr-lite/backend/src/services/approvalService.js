const { getDb } = require('../services/db');

const createNotification = async (tenantId, userId, type, message, data = {}) => {
    try {
        const db = await getDb();
        await db.run(
            "INSERT INTO notifications (tenant_id, user_id, type, message, data_json) VALUES (?, ?, ?, ?, ?)",
            [tenantId, userId, type, message, JSON.stringify(data)]
        );
    } catch (err) {
        console.error('Failed to create notification:', err);
    }
};

const logApproval = async (tenantId, entityType, entityId, action, performedBy, comment) => {
    try {
        const db = await getDb();
        await db.run(
            "INSERT INTO approvals_log (tenant_id, entity_type, entity_id, action, performed_by, comment) VALUES (?, ?, ?, ?, ?, ?)",
            [tenantId, entityType, entityId, action, performedBy, comment]
        );
    } catch (err) {
        console.error('Failed to log approval:', err);
    }
};

module.exports = { createNotification, logApproval };
