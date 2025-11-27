// Simple in-memory rate limiter for login attempts
const loginAttempts = new Map();

const rateLimiter = {
    MAX_ATTEMPTS: 5,
    BLOCK_DURATION: 5 * 60 * 1000, // 5 minutes

    // Record failed login attempt
    recordAttempt(identifier) {
        const now = Date.now();
        const attempts = loginAttempts.get(identifier) || { count: 0, firstAttempt: now, blockedUntil: null };

        // Reset if block duration expired
        if (attempts.blockedUntil && now > attempts.blockedUntil) {
            loginAttempts.delete(identifier);
            return this.recordAttempt(identifier);
        }

        // Reset if more than block duration since first attempt
        if (now - attempts.firstAttempt > this.BLOCK_DURATION) {
            attempts.count = 1;
            attempts.firstAttempt = now;
        } else {
            attempts.count++;
        }

        // Block if exceeded max attempts
        if (attempts.count >= this.MAX_ATTEMPTS) {
            attempts.blockedUntil = now + this.BLOCK_DURATION;
        }

        loginAttempts.set(identifier, attempts);
    },

    // Check if identifier is blocked
    isBlocked(identifier) {
        const attempts = loginAttempts.get(identifier);
        if (!attempts) return false;

        const now = Date.now();
        if (attempts.blockedUntil && now < attempts.blockedUntil) {
            return true;
        }

        return false;
    },

    // Reset attempts (on successful login)
    reset(identifier) {
        loginAttempts.delete(identifier);
    },

    // Get remaining time in seconds
    getBlockedTime(identifier) {
        const attempts = loginAttempts.get(identifier);
        if (!attempts || !attempts.blockedUntil) return 0;

        const remaining = Math.ceil((attempts.blockedUntil - Date.now()) / 1000);
        return remaining > 0 ? remaining : 0;
    }
};

module.exports = rateLimiter;
