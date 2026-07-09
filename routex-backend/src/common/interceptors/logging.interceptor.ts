import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { randomUUID } from 'crypto';
import { Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const response = httpContext.getResponse<Response>();

    // Correlation Request ID
    const requestId = request.headers['x-request-id'] || randomUUID();
    request.requestId = requestId;

    // Attach request ID to response header for debugging
    response.setHeader('X-Request-ID', requestId);

    const { method, url } = request;
    const ip = request.ip || request.connection.remoteAddress;
    const startTime = Date.now();

    this.logger.log(
      `Incoming request: [${requestId}] ${method} ${url} - IP: ${ip}`,
    );

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;
          this.logger.log(
            `Outgoing response: [${requestId}] ${method} ${url} - Status: ${statusCode} - Time: ${duration}ms`,
          );
        },
        error: (err: any) => {
          const duration = Date.now() - startTime;
          const statusCode = err.status || 500;
          this.logger.error(
            `Request error: [${requestId}] ${method} ${url} - Status: ${statusCode} - Time: ${duration}ms - Message: ${err.message}`,
            err.stack,
          );
        },
      }),
    );
  }
}
