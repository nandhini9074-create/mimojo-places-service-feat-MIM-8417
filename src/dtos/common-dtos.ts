import { IsEmail, IsString, IsNotEmpty, IsJWT, MaxLength, MinLength } from 'class-validator';

export class IsEmailDto {
  @IsString()
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class IsJwtTokenDto {
  @IsJWT()
  @IsNotEmpty()
  @IsString()
  token: string;
}

export class IsMobilePhoneDto {
  @MaxLength(17)
  @MinLength(12)
  @IsNotEmpty()
  mobile: string;
}
