import { IsNotEmptyString } from '../../common/decorators/IsNotEmptyString';

export class UpdateMerchantMainAdminDto {
  @IsNotEmptyString()
  userId: string;
}
