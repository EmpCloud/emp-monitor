import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserActivityDataMongoModel } from './models/user-activity-data.model';
import { UserSystemLogsMongoModel } from './models/user-system-logs.model';
import { UserActivityDataSchema } from './schemas/user-activity-data.schema';
import { UserSystemLogsSchema } from './schemas/user-system-logs.schema';
import { ConfigModule } from '@nestjs/config';

const ProvidersAndExports = [
    UserActivityDataMongoModel,
    UserSystemLogsMongoModel,
];

const mongoOption: any = {};

if (process.env.NODE_ENV === 'production') {
    mongoOption.auth = { user: process.env.MONGO_USER, password: process.env.MONGO_PASSWORD };
}

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        MongooseModule.forRoot(process.env.MONGO_URI, mongoOption),
        MongooseModule.forFeature([
            { name: 'UserActivityData', schema: UserActivityDataSchema },
            { name: 'UserSystemLogs', schema: UserSystemLogsSchema },
        ])],
    providers: ProvidersAndExports,
    exports: ProvidersAndExports,
})
export class MongooseDBModule { }
