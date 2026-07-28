import { IsBoolean, IsNotEmpty, IsUUID } from 'class-validator';

export class BookmarkOutletDto {
  @IsUUID()
  @IsNotEmpty()
  outletId: string;

  @IsBoolean()
  @IsNotEmpty()
  isBookmarked: boolean;
}
