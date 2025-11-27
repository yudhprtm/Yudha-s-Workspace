const bcrypt = require('bcryptjs');
const { getDb } = require('../services/db');

// Generate 6-digit reset code
const generateResetCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Request password reset - returns code to display to user
const requestReset = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const db = await getDb();
        const user = await db.get('SELECT id FROM users WHERE email = ? AND status = ?', [email, 'active']);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Generate reset code
        const resetCode = generateResetCode();
        const resetCodeHash = await bcrypt.hash(resetCode, 8);
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        // Save hashed code and expiration
        await db.run(
            'UPDATE users SET reset_code_hash = ?, reset_code_expires = ? WHERE id = ?',
            [resetCodeHash, expiresAt.toISOString(), user.id]
        );

        // Return the plain code to display to user (no email sending)
        res.json({
            message: 'Reset code generated',
            resetCode: resetCode,
            expiresIn: '15 minutes'
        });
    } catch (err) {
        next(err);
    }
};

// Reset password using code
const resetPassword = async (req, res, next) => {
    try {
        const { email, code, newPassword } = req.body;

        if (!email || !code || !newPassword) {
            return res.status(400).json({ error: 'Email, code, and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const db = await getDb();
        const user = await db.get(
            'SELECT id, reset_code_hash, reset_code_expires FROM users WHERE email = ? AND status = ?',
            [email, 'active']
        );

        if (!user || !user.reset_code_hash || !user.reset_code_expires) {
            return res.status(400).json({ error: 'Invalid or expired reset request' });
        }

        // Check expiration
        const now = new Date();
        const expiresAt = new Date(user.reset_code_expires);
        if (now > expiresAt) {
            // Clear expired code
            await db.run('UPDATE users SET reset_code_hash = NULL, reset_code_expires = NULL WHERE id = ?', [user.id]);
            return res.status(400).json({ error: 'Reset code has expired' });
        }

        // Verify code
        const isValidCode = await bcrypt.compare(code, user.reset_code_hash);
        if (!isValidCode) {
            return res.status(400).json({ error: 'Invalid reset code' });
        }

        // Hash new password and update
        const passwordHash = await bcrypt.hash(newPassword, 10);
        await db.run(
            'UPDATE users SET password_hash = ?, reset_code_hash = NULL, reset_code_expires = NULL WHERE id = ?',
            [passwordHash, user.id]
        );

        res.json({ message: 'Password reset successfully' });
    } catch (err) {
        next(err);
    }
};

// Change password (authenticated user)
const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const userId = req.user.id;

        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ error: 'New passwords do not match' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const db = await getDb();
        const user = await db.get('SELECT password_hash FROM users WHERE id = ?', [userId]);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Hash and update new password
        const passwordHash = await bcrypt.hash(newPassword, 10);
        await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);

        res.json({ message: 'Password changed successfully' });
    } catch (err) {
        next(err);
    }
};

module.exports = { requestReset, resetPassword, changePassword };
