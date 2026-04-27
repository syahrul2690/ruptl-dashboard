import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AccessStrategy } from './strategies/access.strategy';
import { RefreshStrategy } from './strategies/refresh.strategy';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [JwtModule.register({}), PassportModule, AuditModule],
  controllers: [AuthController],
  providers: [AuthService, AccessStrategy, RefreshStrategy],
  exports: [AuthService],
})
export class AuthModule {}
