import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @ApiProperty({ format: 'email', example: 'ali@example.com' })
  @IsEmail({}, { message: 'email must be a valid email address' })
  email: string;

  @ApiProperty({ example: 'Passw0rd!' })
  @IsNotEmpty({ message: 'password is required' })
  password: string;
}
