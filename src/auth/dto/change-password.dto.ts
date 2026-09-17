import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'CurrentPassword123!' })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ example: 'NewStrongPassword456!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'New password must be at least 6 characters long' })
  newPassword: string;
}
