import { IsNotEmptyString } from '../../common/decorators/IsNotEmptyString';

export class ReInviteMemberDto {
  @IsNotEmptyString()
  userId: string;
}
