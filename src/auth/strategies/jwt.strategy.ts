import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { Request } from 'express';
import { APP_CONSTANTS } from '../../common/constants/app.constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request) => {
          return req?.cookies?.[APP_CONSTANTS.JWT_ACCESS_COOKIE] || null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('app.jwt.accessSecret') || 'default_dev_access_secret_12345',
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid or expired authentication session');
    }
    return user;
  }
}
