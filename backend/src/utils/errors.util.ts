const ERRORS_NAME = [
    'ExpiredEmailConfirmError',
    'ExpiredTokenConfirmError',
    'ConflictError',
    'Forbidden',
    'PermissionError',
    'InputValidationError',
    'InvalidEmailConfirmError',
    'InvalidPasswordError',
    'MicroserviceError',
    'UnauthorizedError',
    'ResourceNotFoundError'
] as const;

type ErrorName = typeof ERRORS_NAME[number];

interface ErrorWithStatus extends Error {
    status: number;
}

type ErrorConstructor = {
    new (msg: string, status: number): ErrorWithStatus;
};

const ErrorsUtil: Record<ErrorName, ErrorConstructor> = ERRORS_NAME.reduce((acc, className) => {
    acc[className] = class extends Error implements ErrorWithStatus {
        status: number;
        constructor(msg: string, status: number) {
            super(msg);
            this.status = status;
            this.name = className;
        }
    };

    return acc;
}, {} as Record<ErrorName, ErrorConstructor>);

export default ErrorsUtil;
