const db = require('../services/db');

const listNotifications = async (req, res) => {
    try {
        const notifications = await db.all(
            "SELECT * FROM notifications WHERE tenant_id = ? AND user_id = ? AND read = 0 ORDER BY created_at DESC",
            [req.tenantId, req.user.id]
        );
        res.json(notifications);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
};

const markRead = async (req, res) => {
    try {
        await db.run(
            "UPDATE notifications SET read = 1 WHERE id = ? AND tenant_id = ? AND user_id = ?",
            [req.params.id, req.tenantId, req.user.id]
        );
        res.json({ message: 'Marked as read' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update notification' });
    }
};

module.exports = { listNotifications, markRead };
