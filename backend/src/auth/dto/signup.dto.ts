import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, Matches, MinLength } from 'class-validator';

const PASSWORD_STRENGTH_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

export class SignupDto {
  @ApiProperty({ minLength: 3, example: 'Ali Beshir' })
  @MinLength(3, { message: 'name must be at least 3 characters long' })
  name: string;

  @ApiProperty({ format: 'email', example: 'ali@example.com' })
  @IsEmail({}, { message: 'email must be a valid email address' })
  email: string;

  @ApiProperty({
    minLength: 8,
    description: 'At least one letter, one number, and one special character',
    example: 'Passw0rd!',
  })
  @MinLength(8, { message: 'password must be at least 8 characters long' })
  @Matches(PASSWORD_STRENGTH_REGEX, {
    message:
      'password must contain at least one letter, one number, and one special character',
  })
  password: string;
}
