import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger: Logger = new Logger();
    private readonly isProduction: boolean = process.env.NODE_ENV === 'production';

    public intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const recordTime = Date.now();
        const requestType = context.getType<GqlContextType>();

        if (requestType === 'http') {
            // Develop if needed!
        } else if (requestType === 'graphql') {
            const gqlContext = GqlExecutionContext.create(context);
            const requestBody = gqlContext.getContext().req?.body ?? {};
            const operation = requestBody.operationName ?? 'anonymous';

            return next.handle().pipe(
                tap((contex) => {
                    const responseTime = Date.now() - recordTime;
                    if (!this.isProduction) {
                        this.logger.log(`[${operation}] ${this.stringify(contex)} - ${responseTime}ms`, 'RESPONSE');
                    } else {
                        this.logger.log(`[${operation}] ${responseTime}ms`, 'RESPONSE');
                    }
                }),
            );
        }
        return next.handle();
    }

    private stringify(contex: ExecutionContext): string {
        return JSON.stringify(contex).slice(0, 75);
    }
}