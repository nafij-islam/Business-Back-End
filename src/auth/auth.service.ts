import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/reset-password.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AuditAction } from '../common/enums';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account has been deactivated. Please contact support.');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateTokens(user._id.toString(), user.email, user.role);

    // Save hashed refresh token server-side for revocation support
    await this.usersService.updateRefreshTokenHash(user._id.toString(), tokens.refreshToken);
    await this.usersService.updateLastLogin(user._id.toString());

    await this.auditLogsService.log({
      userId: user._id.toString(),
      action: AuditAction.LOGIN,
      entityType: 'User',
      entityId: user._id.toString(),
      summary: `User ${user.email} logged in successfully`,
      ip,
      userAgent,
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    };
  }

  async refreshTokens(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret:
          this.configService.get<string>('app.jwt.refreshSecret') ||
          'default_dev_refresh_secret_67890',
      });

      const user = await this.usersService.findById(payload.sub);
      if (!user || !user.refreshTokenHash || !user.isActive) {
        throw new UnauthorizedException('Session expired or revoked. Please log in again.');
      }

      const isRefreshTokenMatch = await bcrypt.compare(refreshToken, user.refreshTokenHash);
      if (!isRefreshTokenMatch) {
        throw new UnauthorizedException('Invalid refresh session. Please log in again.');
      }

      const tokens = await this.generateTokens(user._id.toString(), user.email, user.role);
      await this.usersService.updateRefreshTokenHash(user._id.toString(), tokens.refreshToken);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
        },
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: string) {
    await this.usersService.updateRefreshTokenHash(userId, null);
    return { message: 'Logged out successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto, ip?: string, userAgent?: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('Current password is incorrect');
    }

    const newHash = await bcrypt.hash(dto.newPassword, 12);
    await this.usersService.updatePassword(userId, newHash);

    await this.auditLogsService.log({
      userId,
      action: AuditAction.PASSWORD_CHANGE,
      entityType: 'User',
      entityId: userId,
      summary: `User ${user.email} changed their password`,
      ip,
      userAgent,
    });

    return { message: 'Password updated successfully. Please log in again.' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      // Return success message to avoid email enumeration
      return {
        message: 'If this email exists in our system, reset instructions have been generated.',
      };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour

    await this.usersService.setResetToken(user._id.toString(), hashedToken, expires);

    // In a production setup, email is sent here. Return resetToken in dev response for testing
    const isDev = this.configService.get<string>('app.nodeEnv') !== 'production';

    return {
      message: 'If this email exists in our system, reset instructions have been generated.',
      ...(isDev ? { devResetToken: resetToken } : {}),
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const hashedToken = crypto.createHash('sha256').update(dto.token).digest('hex');
    const user = await this.usersService.findByResetToken(hashedToken);

    if (!user) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    const newHash = await bcrypt.hash(dto.newPassword, 12);
    await this.usersService.updatePassword(user._id.toString(), newHash);
    await this.usersService.clearResetToken(user._id.toString());

    return { message: 'Password reset successfully. You may now log in with your new password.' };
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret:
          this.configService.get<string>('app.jwt.accessSecret') ||
          'default_dev_access_secret_12345',
        expiresIn: this.configService.get<string>('app.jwt.accessExpiresIn') || '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret:
          this.configService.get<string>('app.jwt.refreshSecret') ||
          'default_dev_refresh_secret_67890',
        expiresIn: this.configService.get<string>('app.jwt.refreshExpiresIn') || '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
