import { Transform } from 'class-transformer';
import { IsArray, IsEmail, IsOptional, IsString } from 'class-validator';
import { IsNotEmptyString } from '../../common/decorators/IsNotEmptyString';

export class InviteMembersDto {
  @IsNotEmptyString()
  merchantId: string;

  @IsNotEmptyString()
  roleId: string;

  @IsArray()
  @IsEmail({}, { each: true })
  @Transform(({ value }) => {
    return value.map((email) => email.trim().toLowerCase());
  })
  declare emails: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  declare outletIds: string[];
}
