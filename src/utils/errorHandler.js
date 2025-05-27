class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    res.status(err.statusCode).json({
        success: false,
        error: {
            message: err.message,
            status: err.status,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        },
        timestamp: new Date().toISOString()
    });
};

module.exports = {
    AppError,
    errorHandler
}; 