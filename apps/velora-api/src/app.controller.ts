import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AppService, HealthStatus } from './app.service';

@Controller()
export class AppController {
	constructor(private readonly appService: AppService) {}

	@Get()
	getHello(): string {
		return this.appService.getHello();
	}

	/** Uptime/load-balancer probe: 200 when the API and MongoDB are reachable, 503 otherwise. */
	@SkipThrottle()
	@Get('health')
	async getHealth(): Promise<HealthStatus> {
		const health = await this.appService.getHealth();
		if (health.status !== 'ok') throw new ServiceUnavailableException(health);
		return health;
	}
}
