const { getDb } = require('../services/db');
const { logger } = require('./logger');

const errorHandler = async (err, req, res, next) => {
    logger.error(err.message, { stack: err.stack });

    const tenantId = req.tenantId || null;
    const route = req.originalUrl;
    const payload = JSON.stringify(req.body || {});

    try {
        const db = await getDb();
        await db.run(
            "INSERT INTO errors (tenant_id, route, error_message, stack_trace, payload_json) VALUES (?, ?, ?, ?, ?)",
            [tenantId, route, err.message, err.stack, payload]
        );
    } catch (dbErr) {
        logger.error('Failed to log error to DB', dbErr);
    }

    const statusCode = err.statusCode || 500;
    const message = statusCode === 500 ? 'Internal Server Error' : err.message;

    res.status(statusCode).json({ error: message });
};

module.exports = errorHandler;
