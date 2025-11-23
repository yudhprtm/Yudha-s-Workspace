const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getDb } = require('../services/db');

const generateTokens = (user) => {
    const payload = {
        id: user.id,
        tenantId: user.tenant_id,
        role: user.role,
        email: user.email
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: parseInt(process.env.JWT_TTL_SECONDS) });
    const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: parseInt(process.env.JWT_REFRESH_TTL_SECONDS) });

    return { token, refreshToken };
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const db = await getDb();

        const user = await db.get("SELECT * FROM users WHERE email = ?", [email]);

        if (!user) {
            // N1: Invalid credentials -> 401 Unauthorized with generic message
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (user.status !== 'active') {
            return res.status(403).json({ error: 'Account inactive' });
        }

        const tokens = generateTokens(user);
        res.json(tokens);
    } catch (err) {
        next(err);
    }
};

const refresh = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

        try {
            const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
            const db = await getDb();
            const user = await db.get("SELECT * FROM users WHERE id = ?", [decoded.id]);

            if (!user) return res.status(401).json({ error: 'User not found' });

            const tokens = generateTokens(user);
            res.json(tokens);
        } catch (err) {
            return res.status(401).json({ error: 'Invalid refresh token' });
        }
    } catch (err) {
        next(err);
    }
};

module.exports = { login, refresh };
