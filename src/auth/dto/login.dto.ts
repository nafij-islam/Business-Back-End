import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@apexenterprise.com' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'StrongPassword123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;
}
