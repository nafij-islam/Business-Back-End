import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Role } from '../../common/enums';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ default: null })
  avatar?: string;

  @Prop({ type: String, enum: Role, default: Role.ADMIN, index: true })
  role: Role;

  @Prop({ default: true, index: true })
  isActive: boolean;

  @Prop({ default: null })
  lastLoginAt?: Date;

  @Prop({ default: null })
  refreshTokenHash?: string;

  @Prop({ default: null })
  resetPasswordToken?: string;

  @Prop({ default: null })
  resetPasswordExpires?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.refreshTokenHash;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;
  delete obj.__v;
  return obj;
};
