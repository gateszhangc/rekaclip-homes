/**
 * Base class for all application errors.
 * These errors are considered "operational" and safe to display to the user if needed.
 */
export class AppError extends Error {
    public readonly isOperational: boolean = true;

    constructor(
        public message: string,
        public code: number = -1,     // Business error code (e.g. -2 for insufficient credits)
        public statusCode: number = 400 // HTTP status code
    ) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = this.constructor.name;
    }
}

/**
 * Thrown when user inputs are invalid.
 */
export class ValidationError extends AppError {
    constructor(message: string) {
        super(message, -1, 400);
    }
}

/**
 * Thrown when user does not have enough credits.
 */
export class InsufficientCreditsError extends AppError {
    constructor(message: string = "Not enough credits") {
        super(message, -2, 402);
    }
}

/**
 * Thrown when an upstream service (like Replicate, R2) fails.
 */
export class UpstreamServiceError extends AppError {
    constructor(
        message: string = "Service temporarily unavailable",
        public readonly serviceName: string,
        public readonly originalError?: any
    ) {
        super(message, -3, 502);
    }
}

/**
 * Thrown specifically when Replicate quota is exceeded (Payment Required).
 * Critical error that requires admin attention.
 */
export class ServiceQuotaExceededError extends UpstreamServiceError {
    constructor(serviceName: string = "AI Provider") {
        super(`System service quota exceeded for ${serviceName}. Please contact admin.`, serviceName);
        this.statusCode = 503;
    }
}
