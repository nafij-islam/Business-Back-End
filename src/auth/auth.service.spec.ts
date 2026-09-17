import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '../common/enums';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<Partial<UsersService>>;
  let jwtService: jest.Mocked<Partial<JwtService>>;
  let auditLogsService: jest.Mocked<Partial<AuditLogsService>>;

  const mockUser = {
    _id: 'user123',
    email: 'admin@apexenterprise.com',
    passwordHash: '',
    role: Role.ADMIN,
    isActive: true,
    firstName: 'Admin',
    lastName: 'User',
    refreshTokenHash: '',
  };

  beforeAll(async () => {
    mockUser.passwordHash = await bcrypt.hash('StrongPass123!', 10);
  });

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn().mockImplementation(async (email) => {
        if (email === mockUser.email) return mockUser as any;
        return null;
      }),
      findById: jest.fn().mockImplementation(async (id) => {
        if (id === mockUser._id) return mockUser as any;
        return null;
      }),
      updateRefreshTokenHash: jest.fn().mockResolvedValue(undefined),
      updateLastLogin: jest.fn().mockResolvedValue(undefined),
      updatePassword: jest.fn().mockResolvedValue(undefined),
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mock_token_xyz'),
      verify: jest
        .fn()
        .mockReturnValue({ sub: 'user123', email: 'admin@apexenterprise.com', role: Role.ADMIN }),
    };

    auditLogsService = {
      log: jest.fn().mockResolvedValue(null as any),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test_secret'),
          },
        },
        { provide: AuditLogsService, useValue: auditLogsService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('login', () => {
    it('should successfully log in with valid credentials', async () => {
      const res = await authService.login({
        email: 'admin@apexenterprise.com',
        password: 'StrongPass123!',
      });

      expect(res).toHaveProperty('accessToken');
      expect(res).toHaveProperty('refreshToken');
      expect(res.user.email).toBe('admin@apexenterprise.com');
      expect(usersService.updateRefreshTokenHash).toHaveBeenCalled();
      expect(auditLogsService.log).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException on invalid password', async () => {
      await expect(
        authService.login({
          email: 'admin@apexenterprise.com',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException on non-existent email', async () => {
      await expect(
        authService.login({
          email: 'notfound@apexenterprise.com',
          password: 'SomePassword!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should clear refresh token hash on logout', async () => {
      const res = await authService.logout('user123');
      expect(usersService.updateRefreshTokenHash).toHaveBeenCalledWith('user123', null);
      expect(res).toEqual({ message: 'Logged out successfully' });
    });
  });
});
