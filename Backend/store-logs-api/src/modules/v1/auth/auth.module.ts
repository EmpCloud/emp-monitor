// @ts-nocheck
import { Module } from '@nestjs/common';
import { AuthService } from './utils/auth.service';
import { CryptoService } from './utils/crypto.service';
import { JWTService } from './utils/jwt.service';
import { ConfigModule } from '@nestjs/config';
import { HelperModule } from 'src/common/helper/helper.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    HelperModule
  ],
  providers: [CryptoService, JWTService, AuthService],
  exports: [AuthService]
})
export class AuthModule { }
