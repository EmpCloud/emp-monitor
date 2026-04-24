import { MongooseDBModule } from '../../../database/mongoose-db/mongoose-db.module';
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DesktopController } from './desktop.controller';
import { ActivityService } from './service/activity.service';
// import { SequelizeDbModule } from 'src/database/sequelize-db/sequelize-db.module';
import { HelperModule } from 'src/common/helper/helper.module';
import { ScreenshotService } from './service/screenshot.service';
import { ScreenRecordService } from './service/screen-record.service';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule } from '@nestjs/config';
import { UserFeatureService } from './service/user-feature.service';
import { SystemLogsService } from './service/system-logs.service';
import { SequelizeDbModule } from 'src/database/sequelize-db/sequelize-db.module';
import { ProductionStatsService } from './service/production-stat.service';
import { Logger } from '../../../common/errlogger/logger';


@Module({
    imports: [
        ConfigModule.forRoot(),
        MongooseDBModule,
        HelperModule,
        SequelizeDbModule,
        MulterModule.register({ dest: process.env.SS_UPLOAD_PATH }),
        HttpModule
    ],
    controllers: [DesktopController],
    providers: [ActivityService, ScreenshotService, ScreenRecordService, SystemLogsService, UserFeatureService, ProductionStatsService, Logger]
})
export class DesktopModule { }
