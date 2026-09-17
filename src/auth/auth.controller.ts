import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/reset-password.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';
import { APP_CONSTANTS } from '../common/constants/app.constants';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in with email and password' })
  async login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userAgent = req.get('user-agent');
    const result = await this.authService.login(dto, ip, userAgent);

    this.setRefreshTokenCookie(res, result.refreshToken);

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken, // also provided for mobile / API clients
      user: result.user,
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  async refresh(
    @Req() req: Request,
    @Body('refreshToken') bodyRefreshToken: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.[APP_CONSTANTS.JWT_REFRESH_COOKIE] || bodyRefreshToken;
    const result = await this.authService.refreshTokens(token);

    this.setRefreshTokenCookie(res, result.refreshToken);

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log out and revoke refresh token' })
  async logout(@CurrentUser('id') userId: string, @Res({ passthrough: true }) res: Response) {
    res.clearCookie(APP_CONSTANTS.JWT_REFRESH_COOKIE, {
      httpOnly: true,
      secure: this.configService.get<boolean>('app.cookieSecure'),
      sameSite: 'lax',
      domain: this.configService.get<string>('app.cookieDomain') || undefined,
      path: '/',
    });

    return this.authService.logout(userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Get profile of current authenticated user' })
  async getMe(@CurrentUser() user: any) {
    return {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change current user password' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    const userAgent = req.get('user-agent');
    return this.authService.changePassword(userId, dto, ip, userAgent);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset instructions' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  private setRefreshTokenCookie(res: Response, token: string) {
    const isProd = this.configService.get<boolean>('app.isProduction');
    const cookieSecure = this.configService.get<boolean>('app.cookieSecure');
    const domain = this.configService.get<string>('app.cookieDomain') || undefined;

    res.cookie(APP_CONSTANTS.JWT_REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: cookieSecure || isProd,
      sameSite: 'lax',
      domain,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}
