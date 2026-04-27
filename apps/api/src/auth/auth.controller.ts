import { Controller, Post, Body, Req, Res, UseGuards, Get, HttpCode } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AccessGuard } from './guards/access.guard';
import { RefreshGuard } from './guards/refresh.guard';

const COOKIE_BASE = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } = await this.auth.login(dto.email, dto.password, req.ip);
    res.cookie('access_token',  accessToken,  { ...COOKIE_BASE, maxAge: 15 * 60 * 1000 });
    res.cookie('refresh_token', refreshToken, { ...COOKIE_BASE, maxAge: 7 * 24 * 60 * 60 * 1000 });
    return { user };
  }

  @Post('refresh')
  @UseGuards(RefreshGuard)
  @HttpCode(200)
  async refresh(
    @Req() req: Request & { user: any },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.auth.refresh(req.user.id);
    res.cookie('access_token',  accessToken,  { ...COOKIE_BASE, maxAge: 15 * 60 * 1000 });
    res.cookie('refresh_token', refreshToken, { ...COOKIE_BASE, maxAge: 7 * 24 * 60 * 60 * 1000 });
    return { ok: true };
  }

  @Post('logout')
  @UseGuards(AccessGuard)
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token',  { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
    return { ok: true };
  }

  @Get('me')
  @UseGuards(AccessGuard)
  me(@Req() req: Request & { user: any }) {
    return { user: req.user };
  }
}
