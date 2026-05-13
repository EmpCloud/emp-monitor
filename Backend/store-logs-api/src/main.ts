import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import compression from 'compression';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as moment from 'moment-timezone';
import { ExecutionTimeInterceptor } from './common/interceptors/execution-time.interceptor';
import { json, urlencoded } from 'body-parser';

import swaggerMiddleware from "./common/swagger.auth";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.use(helmet(), compression());
    app.enableCors();
    // Timezone setting
    moment.tz.setDefault(process.env.TIMEZONE);

    // body Parser
    app.use(json({ limit: '50mb' }));
    app.use(urlencoded({ limit: '50mb', extended: true }));

    // Add global interceptor for calculating execution time for completing any req handler
    app.useGlobalInterceptors(new ExecutionTimeInterceptor());

    // Keep self-hosted routes stable without relying on nest-router.
    app.setGlobalPrefix('api/v1');

    SwaggerModule.setup('/api/v1/explorer', app, SwaggerModule.createDocument(app, new DocumentBuilder()
        .setTitle('Emp Service Api Documentation')
        .setDescription('The documentation contains the api docs for project EMP')
        .setVersion('1.0.0')
        .addBearerAuth()
        .build(),
    ));
    await app.listen(process.env.PORT);
}
bootstrap();
