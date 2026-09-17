import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, any>;
        message = obj.message || obj.error || message;
        error = obj.error || error;
      }
    } else if (typeof exception === 'object' && exception !== null) {
      const err = exception as any;

      // Handle MongoDB Duplicate Key (E11000)
      if (err.code === 11000) {
        status = HttpStatus.CONFLICT;
        error = 'Conflict';
        const field = Object.keys(err.keyPattern || {})[0] || 'Field';
        const value = err.keyValue ? err.keyValue[field] : '';
        message = `${field} '${value}' already exists.`;
      } else if (err.name === 'ValidationError') {
        // Mongoose validation error
        status = HttpStatus.BAD_REQUEST;
        error = 'Bad Request';
        const errors = Object.values(err.errors || {}).map((e: any) => e.message);
        message = errors.length > 0 ? errors : err.message;
      } else if (err.name === 'CastError') {
        status = HttpStatus.BAD_REQUEST;
        error = 'Bad Request';
        message = `Invalid ID format for path: ${err.path}`;
      } else {
        this.logger.error(`Unhandled Exception: ${err.message || err}`, err.stack);
      }
    } else {
      this.logger.error(`Unknown Exception: ${exception}`);
    }

    if (status >= 500) {
      this.logger.error(
        `[${request.method}] ${request.url} - ${status} - ${JSON.stringify(message)}`,
      );
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
