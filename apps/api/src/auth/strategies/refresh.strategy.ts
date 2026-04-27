import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { Request } from 'express';

@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, 'refresh') {
  constructor(config: ConfigService, private auth: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.['refresh_token'] ?? null,
      ]),
      secretOrKey: config.get<string>('JWT_REFRESH_SECRET'),
    });
  }

  async validate(payload: { sub: string }) {
    const user = await this.auth.validateRefreshPayload(payload);
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
