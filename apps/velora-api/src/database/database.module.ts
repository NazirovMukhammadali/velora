import { Logger, Module } from '@nestjs/common';
import { InjectConnection, MongooseModule } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

const resolveMongoUri = (): string => {
	const isProduction = process.env.NODE_ENV === 'production';
	const uri = isProduction ? process.env.MONGO_PROD : process.env.MONGO_DEV;

	if (!uri) {
		const expectedKey = isProduction ? 'MONGO_PROD' : 'MONGO_DEV';
		throw new Error(`MongoDB URI is missing. Please set ${expectedKey} in .env`);
	}

	return uri;
};

@Module({
	imports: [
		MongooseModule.forRootAsync({
			useFactory: () => ({
				uri: resolveMongoUri(),
			}),
		}),
	],
	exports: [MongooseModule],
})
export class DatabaseModule {
	private readonly logger = new Logger(DatabaseModule.name);

	constructor(@InjectConnection() private readonly connection: Connection) {
		if (connection.readyState === 1) {
			this.logger.log(
				`MongoDB connected (${process.env.NODE_ENV === 'production' ? 'production' : 'development'})`,
			);
		} else {
			this.logger.warn('MongoDB is not connected');
		}
	}
}
