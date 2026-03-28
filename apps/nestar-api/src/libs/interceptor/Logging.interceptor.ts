import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger: Logger = new Logger();

    public intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const recordTime = Date.now();
        const requestType = context.getType<GqlContextType>();

        if (requestType === 'http') {
            // Develop if needed!
        } else if (requestType === 'graphql') {
            // (1) Print Request
            const gqlContext = GqlExecutionContext.create(context);
            this.logger.log(`${this.stringify(gqlContext.getContext().req.body)}`, 'REQUEST');

            // (2) Errors handling via GraphQl
            //(3) No Errors, giving Response below
            return next.handle().pipe(
                tap((contex) => {
                    const responseTime = Date.now() - recordTime;
                    this.logger.log(`${this.stringify(contex)} - ${responseTime}ms \n\n`, 'RESPONSE');
                }),
            );
        }
        return next.handle();
    }

    private stringify(contex: ExecutionContext): string {
        return JSON.stringify(contex).slice(0, 75);
    }
}