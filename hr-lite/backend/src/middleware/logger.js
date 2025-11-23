const winston = require('winston');
const path = require('path');

const logDir = path.resolve(__dirname, '../../logs');

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
        new winston.transports.File({ filename: path.join(logDir, 'combined.log') }),
    ],
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple(),
    }));
}

const requestLogger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info({
            message: 'Request processed',
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration_ms: duration,
            tenant_id: req.tenantId, // Will be populated by auth middleware
            user_id: req.user ? req.user.id : null
        });
    });
    next();
};

module.exports = { logger, requestLogger };
