import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis, { RedisOptions } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
    private readonly client: Redis;

    constructor() {
        const redisOptions: RedisOptions = {
            host: process.env.REDIS_HOST || '127.0.0.1',
            port: Number(process.env.REDIS_PORT || 6379),
            maxRetriesPerRequest: null
        };

        if (process.env.REDIS_PASSWORD) {
            redisOptions.password = process.env.REDIS_PASSWORD;
        }

        this.client = new Redis(redisOptions);
    }

    getClient() {
        return this.client;
    }

    getOrThrow() {
        return this.client;
    }

    async onModuleDestroy() {
        if (this.client.status !== 'end') {
            await this.client.quit();
        }
    }
}
