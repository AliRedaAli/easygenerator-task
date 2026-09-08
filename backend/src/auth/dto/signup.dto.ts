import { IsEmail, Matches, MinLength } from 'class-validator';

const PASSWORD_STRENGTH_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

export class SignupDto {
  @MinLength(3, { message: 'name must be at least 3 characters long' })
  name: string;

  @IsEmail({}, { message: 'email must be a valid email address' })
  email: string;

  @MinLength(8, { message: 'password must be at least 8 characters long' })
  @Matches(PASSWORD_STRENGTH_REGEX, {
    message:
      'password must contain at least one letter, one number, and one special character',
  })
  password: string;
}
