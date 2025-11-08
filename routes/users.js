import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

// Get user profile
router.get('/profile', async (req, res, next) => {
    try {
        const userId = req.user.id;

        const result = await query(
            `SELECT id, username, email, created_at, last_login, 
                    (SELECT COUNT(*) FROM receipts WHERE user_id = $1 AND deleted_at IS NULL) as receipt_count
             FROM users 
             WHERE id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user: result.rows[0] });
    } catch (err) {
        next(err);
    }
});

// Update user profile
router.put('/profile', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { username, email } = req.body;

        // Validate
        if (!username || !email) {
            return res.status(400).json({ error: 'Username and email are required' });
        }

        // Check if email/username already taken
        const existing = await query(
            'SELECT id FROM users WHERE (email = $1 OR username = $2) AND id != $3',
            [email, username, userId]
        );

        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Username or email already taken' });
        }

        const result = await query(
            `UPDATE users 
             SET username = $1, email = $2, updated_at = CURRENT_TIMESTAMP
             WHERE id = $3
             RETURNING id, username, email, updated_at`,
            [username, email, userId]
        );

        res.json({
            message: 'Profile updated successfully',
            user: result.rows[0]
        });
    } catch (err) {
        next(err);
    }
});

export default router;

