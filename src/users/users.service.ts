import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import * as bcrypt from 'bcrypt';
import { Role } from '../common/enums';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase().trim() }).exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async create(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role?: Role;
  }): Promise<UserDocument> {
    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = new this.userModel({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email.toLowerCase().trim(),
      passwordHash,
      role: data.role || Role.OWNER,
      isActive: true,
    });
    return user.save();
  }

  async updateRefreshTokenHash(userId: string, refreshToken: string | null): Promise<void> {
    const hash = refreshToken ? await bcrypt.hash(refreshToken, 10) : null;
    await this.userModel.findByIdAndUpdate(userId, { refreshTokenHash: hash }).exec();
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { lastLoginAt: new Date() }).exec();
  }

  async updatePassword(userId: string, newPasswordHash: string): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(userId, {
        passwordHash: newPasswordHash,
        refreshTokenHash: null, // invalidate active sessions
      })
      .exec();
  }

  async setResetToken(userId: string, token: string, expires: Date): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(userId, {
        resetPasswordToken: token,
        resetPasswordExpires: expires,
      })
      .exec();
  }

  async clearResetToken(userId: string): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(userId, {
        resetPasswordToken: null,
        resetPasswordExpires: null,
      })
      .exec();
  }

  async count(): Promise<number> {
    return this.userModel.countDocuments().exec();
  }
}
