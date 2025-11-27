// Shared validation utilities for security
const validator = {
    // Check for SQL injection patterns
    hasSQLInjection(input) {
        if (typeof input !== 'string') return false;
        const patterns = [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
            /(--|;|\/\*|\*\/|xp_|sp_)/i,
            /('|(\\')|(;)|(\-\-)|(\/\*))/i
        ];
        return patterns.some(pattern => pattern.test(input));
    },

    // Check for XSS patterns
    hasXSS(input) {
        if (typeof input !== 'string') return false;
        const patterns = [
            /<script[^>]*>.*?<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi,
            /<iframe/gi
        ];
        return patterns.some(pattern => pattern.test(input));
    },

    // Validate email format
    isValidEmail(email) {
        if (!email || typeof email !== 'string') return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    // Validate required fields
    hasRequiredFields(obj, fields) {
        return fields.every(field => {
            const value = obj[field];
            return value !== undefined && value !== null && value !== '';
        });
    },

    // Sanitize string input
    sanitize(input) {
        if (typeof input !== 'string') return input;
        return input.trim().replace(/[<>]/g, '');
    },

    // Validate number
    isValidNumber(value) {
        return !isNaN(value) && isFinite(value);
    },

    // Validate date format (YYYY-MM-DD)
    isValidDate(dateString) {
        if (!dateString || typeof dateString !== 'string') return false;
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(dateString)) return false;
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    },

    // Check for dangerous inputs
    isDangerous(input) {
        return this.hasSQLInjection(input) || this.hasXSS(input);
    }
};

module.exports = validator;
