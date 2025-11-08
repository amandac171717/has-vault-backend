export const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    // Database errors
    if (err.code === '23505') { // Unique violation
        return res.status(409).json({ 
            error: 'Duplicate entry',
            message: 'This record already exists'
        });
    }

    if (err.code === '23503') { // Foreign key violation
        return res.status(400).json({ 
            error: 'Invalid reference',
            message: 'Referenced record does not exist'
        });
    }

    // Validation errors
    if (err.isJoi) {
        return res.status(400).json({ 
            error: 'Validation error',
            details: err.details.map(d => d.message)
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token' });
    }

    // Default error
    const statusCode = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message;

    res.status(statusCode).json({
        error: message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
};

