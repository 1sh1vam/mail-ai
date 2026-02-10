import { Controller, Get, Post, UseGuards, Req, Res, Body, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { OAuthGuard } from './guards/oauth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Initiates Google OAuth flow
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as any;
    const result = await this.authService.login(user);
    
    // Redirect to frontend with Google access token + expiry
    const clientUrl = this.configService.get('clientUrl');
    const params = new URLSearchParams({
      token: result.accessToken,
      expiresAt: result.expiresAt,
      email: result.user.email,
      name: result.user.name,
      picture: result.user.picture || '',
    });
    res.redirect(`${clientUrl}/auth/callback?${params.toString()}`);
  }

  @Get('me')
  @UseGuards(OAuthGuard)
  getProfile(@Req() req: Request) {
    return req.user;
  }

  @Post('refresh')
  async refreshSession(@Body() body: { email: string }) {
    if (!body.email) {
      throw new UnauthorizedException('Email is required');
    }

    try {
      const result = await this.authService.refreshSession(body.email);
      return result;
    } catch (error: any) {
      throw new UnauthorizedException(error.message);
    }
  }

  @Post('logout')
  @UseGuards(OAuthGuard)
  async logout(@Req() req: Request, @Res() res: Response) {
    const user = req.user as any;
    await this.authService.revokeTokens(user.email);
    res.json({ message: 'Logged out successfully' });
  }
}
