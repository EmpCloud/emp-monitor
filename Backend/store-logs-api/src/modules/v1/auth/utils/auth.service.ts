import { Injectable, ForbiddenException, HttpException } from '@nestjs/common';
import { CryptoService } from './crypto.service';
import { JWTService } from './jwt.service';
import { RedisService } from 'src/common/helper/redis.helper.service';

import config from '../../../../../../config/config.js';

let screenshotCustomRequestLimit = [...config.CUSTOM_SCREENSHOT_FREQUENCY_120_PER_HOUR, ...config.CUSTOM_SCREENSHOT_FREQUENCY_180_PER_HOUR, ...config.CUSTOM_SCREENSHOT_FREQUENCY_240_PER_HOUR, ...config.CUSTOM_SCREENSHOT_FREQUENCY_360_PER_HOUR, ...config.CUSTOM_SCREENSHOT_FREQUENCY_480_PER_HOUR, ...config.CUSTOM_SCREENSHOT_FREQUENCY_600_PER_HOUR, ...config.CUSTOM_SCREENSHOT_FREQUENCY_720_PER_HOUR, ...config.CUSTOM_SCREENSHOT_FREQUENCY_900_PER_HOUR, ...config.CUSTOM_SCREENSHOT_FREQUENCY_1200_PER_HOUR, ...config.CUSTOM_SCREENSHOT_FREQUENCY_1800_PER_HOUR, ...config.CUSTOM_SCREENSHOT_FREQUENCY_3600_PER_HOUR];

let MAX_REQUEST_ALLOWED = process.env.MAX_REQUEST_ALLOWED;

@Injectable()
export class AuthService {

    constructor(
        private readonly crytoService: CryptoService,
        private readonly jwtService: JWTService,
        private readonly redisService: RedisService
    ) { }

    async verify(token: string): Promise<any> {

        // logout token check
        const invalidToken = await this.redisService.getClient().get(token);
        if (invalidToken) {
            throw new ForbiddenException('Invalid token');
        }
        const decryptedToken: any = await this.crytoService.decrypt(token, process.env.CRYPTO_PASSWORD);

        if (decryptedToken.error || decryptedToken.code !== 200) {
            throw new ForbiddenException('Invalid token');
            // throw new ForbiddenException('Invalid token string.');
        }

        token = decryptedToken.decoded;

        const decodedButEncryptedToken: any = await this.jwtService.verifyToken(token);
        if (decodedButEncryptedToken.signature) {
            const decryptedSignature: any = await this.crytoService.decrypt(decodedButEncryptedToken.signature, process.env.CRYPTO_PASSWORD);

            if (decryptedSignature.error || decryptedSignature.code !== 200) {
                throw new ForbiddenException('Invalid token');
                // throw new ForbiddenException('Invalid token string.');
            }

            const decoded = JSON.parse(decryptedSignature.decoded);

            const [userData, requestCount] = await Promise.all([
                await this.redisService.getClient().get(decoded.user_id),
                await this.redisService.getClient().get(`${decoded.user_id}_agent_request`)

            ]);

            //Check request limit
            if (~~requestCount > +(MAX_REQUEST_ALLOWED || 20) - 1 && !screenshotCustomRequestLimit.includes(decoded?.organization_id)) {
                throw new HttpException({
                    statusCode: 401,
                    error: 'Exceeded the number of allotted requests in a specific time frame',
                    message: 'Exceeded the number of allotted requests in a specific time frame',
                }, 401);
            }
            //Set request limit
            if (!screenshotCustomRequestLimit.includes(decoded?.organization_id)) {
                await this.redisService.getClient().set(`${decoded.user_id}_agent_request`, ~~requestCount + 1, 'EX', +(process.env.MAX_REQUEST_ALLOWED_TIMEFRAME || 60));
            }
            return userData;
            // return await this.redisService.getClient().get(decoded.user_id);
        } else {
            throw new ForbiddenException('Invalid token');
            // throw new ForbiddenException('Not autherised to access this.');
        }
    }
}
