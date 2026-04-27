import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { Request } from 'express';

@Injectable()
export class AccessStrategy extends PassportStrategy(Strategy, 'access') {
  constructor(config: ConfigService, private auth: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.['access_token'] ?? null,
      ]),
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    const user = await this.auth.validateAccessPayload(payload);
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
