import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { HelperModule } from './common/helper/helper.module';
import { MongooseDBModule } from './database/mongoose-db/mongoose-db.module';
import { AuthModule } from './modules/v1/auth/auth.module';
import { DesktopModule } from './modules/v1/desktop/desktop.module';
import { AuthMiddleware } from './modules/v1/auth/auth.middleware';
import { DesktopController } from './modules/v1/desktop/desktop.controller';
import { TimesheetModule } from './modules/v1/timesheet/timesheet.module';
import { TimesheetController } from './modules/v1/timesheet/timesheet.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseDBModule,
    HelperModule, AuthModule,
    DesktopModule,
    TimesheetModule
  ],
  controllers: [AppController],
  providers: [AppService],
})

export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(DesktopController, TimesheetController);
  }
}
