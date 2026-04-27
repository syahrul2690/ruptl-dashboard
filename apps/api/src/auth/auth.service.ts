import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private audit: AuditService,
  ) {}

  async login(email: string, password: string, ip?: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      await this.audit.log({ userId: 'unknown', userEmail: email, action: 'LOGIN_FAIL', entity: 'User', ip });
      throw new UnauthorizedException('Email atau password salah');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      await this.audit.log({ userId: user.id, userEmail: user.email, action: 'LOGIN_FAIL', entity: 'User', entityId: user.id, ip });
      throw new UnauthorizedException('Email atau password salah');
    }

    await this.audit.log({ userId: user.id, userEmail: user.email, action: 'LOGIN', entity: 'User', entityId: user.id, ip });

    return {
      accessToken:  this.signAccess(user.id, user.email, user.role),
      refreshToken: this.signRefresh(user.id),
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }

  async refresh(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) throw new UnauthorizedException();
    return {
      accessToken:  this.signAccess(user.id, user.email, user.role),
      refreshToken: this.signRefresh(user.id),
    };
  }

  async validateAccessPayload(payload: { sub: string; email: string; role: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) return null;
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }

  async validateRefreshPayload(payload: { sub: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) return null;
    return user;
  }

  private signAccess(userId: string, email: string, role: string) {
    return this.jwtService.sign(
      { sub: userId, email, role },
      { secret: this.config.get('JWT_ACCESS_SECRET'), expiresIn: this.config.get('JWT_ACCESS_EXPIRES') || '15m' },
    );
  }

  private signRefresh(userId: string) {
    return this.jwtService.sign(
      { sub: userId },
      { secret: this.config.get('JWT_REFRESH_SECRET'), expiresIn: this.config.get('JWT_REFRESH_EXPIRES') || '7d' },
    );
  }
}
