import { ApiResponse } from '@freedomtalk/shared';
import { ApiError, ApiErrorCode } from '../types/api.types';
export declare class AppError extends Error {
    statusCode: number;
    code: string;
    constructor(statusCode: number, code: string, message: string);
}
export declare function successResponse<T>(data: T, meta?: any): ApiResponse<T>;
export declare function errorResponse(error: ApiError, requestId?: string): ApiResponse;
export declare function genericErrorResponse(message: string, code?: ApiErrorCode, requestId?: string): ApiResponse;
export declare function validationErrorResponse(errors: any, requestId?: string): ApiResponse;
//# sourceMappingURL=errors.d.ts.map