import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { CookieOptions, Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { SignupDto } from './dto/signup.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { JwtRefreshGuard } from './jwt-refresh.guard.js';

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

interface AuthenticatedRequest extends Request {
  user: { userId: string; email: string; name: string };
}

interface RefreshAuthenticatedRequest extends Request {
  user: { userId: string; email: string; name: string; refreshToken: string };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @ApiOperation({ summary: 'Create an account and start a session' })
  @ApiResponse({ status: 201, description: 'Account created, cookies set' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  @Post('signup')
  async signup(@Body() dto: SignupDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.authService.signup(dto.name, dto.email, dto.password);
    const { accessToken, refreshToken } = await this.authService.issueTokenPair(user);
    this.setAuthCookies(res, accessToken, refreshToken);
    return { name: user.name, email: user.email };
  }

  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiResponse({ status: 201, description: 'Logged in, cookies set' })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.authService.validateUser(dto.email, dto.password);
    const { accessToken, refreshToken } = await this.authService.issueTokenPair(user);
    this.setAuthCookies(res, accessToken, refreshToken);
    return { name: user.name, email: user.email };
  }

  @ApiCookieAuth('refresh_token')
  @ApiOperation({ summary: 'Rotate the access/refresh token pair' })
  @ApiResponse({ status: 201, description: 'Rotated, new cookies set' })
  @ApiResponse({ status: 401, description: 'Missing, expired, or already-rotated refresh token' })
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  async refresh(@Req() req: RefreshAuthenticatedRequest, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken } = await this.authService.refresh(
      req.user.userId,
      req.user.refreshToken,
    );
    this.setAuthCookies(res, accessToken, refreshToken);
    return { name: req.user.name, email: req.user.email };
  }

  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'End the session and revoke the refresh token' })
  @ApiResponse({ status: 201, description: 'Logged out, cookies cleared' })
  @ApiResponse({ status: 401, description: 'Missing or expired access token' })
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.user.userId);
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    return { status: 'ok' };
  }

  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Get the current logged-in user' })
  @ApiResponse({ status: 200, description: 'The current user' })
  @ApiResponse({ status: 401, description: 'Missing or expired access token' })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: AuthenticatedRequest) {
    return { name: req.user.name, email: req.user.email };
  }

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    const base: CookieOptions = {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'lax',
    };
    res.cookie('access_token', accessToken, { ...base, maxAge: FIFTEEN_MINUTES_MS });
    res.cookie('refresh_token', refreshToken, { ...base, maxAge: SEVEN_DAYS_MS });
  }
}
