import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ResponseFormat<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: Record<string, any>;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ResponseFormat<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ResponseFormat<T> | any> {
    const req = context.switchToHttp().getRequest();
    if (req?.path === '/health' || req?.url === '/health') {
      return next.handle();
    }

    return next.handle().pipe(
      map((result) => {
        // If result is already formatted or undefined/null
        if (result && typeof result === 'object') {
          if ('success' in result && 'data' in result) {
            return result;
          }
          if ('data' in result && ('meta' in result || 'total' in result)) {
            const { data, message, ...meta } = result;
            return {
              success: true,
              data,
              message: message || 'Operation successful',
              meta,
            };
          }
        }

        return {
          success: true,
          data: result,
          message: 'Operation successful',
        };
      }),
    );
  }
}
