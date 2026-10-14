import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, ConnectionStates } from 'mongoose';

const DB_PING_TIMEOUT_MS = 3_000;

export type HealthStatus = {
	status: 'ok' | 'error';
	uptime: number;
	timestamp: string;
	database: { status: 'up' | 'down'; state: string };
};

@Injectable()
export class AppService {
	constructor(@InjectConnection() private readonly connection: Connection) {}

	getHello(): string {
		return 'Welcome to Velora API Server!';
	}

	/** Server liveness plus a real MongoDB round-trip (readyState alone can be stale). */
	async getHealth(): Promise<HealthStatus> {
		const state = ConnectionStates[this.connection.readyState] ?? 'unknown';
		const dbUp = this.connection.readyState === ConnectionStates.connected && (await this.pingDatabase());
		return {
			status: dbUp ? 'ok' : 'error',
			uptime: Math.round(process.uptime()),
			timestamp: new Date().toISOString(),
			database: { status: dbUp ? 'up' : 'down', state },
		};
	}

	private async pingDatabase(): Promise<boolean> {
		const db = this.connection.db;
		if (!db) return false;
		let timer: NodeJS.Timeout;
		const timeout = new Promise<boolean>((resolve) => {
			timer = setTimeout(() => resolve(false), DB_PING_TIMEOUT_MS);
		});
		const ping = db
			.admin()
			.ping()
			.then(() => true)
			.catch(() => false);
		return Promise.race([ping, timeout]).finally(() => clearTimeout(timer));
	}
}
