import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl, IsUUID } from "class-validator";
import { OutletFastPaymentStatusEnum } from "../enums/outlet-status-enum";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class OutletFastPaymentStatusDto {
  @ApiProperty({
    description: 'Unique identifier of the merchant',
    format: 'uuid',
  })
  @IsNotEmpty()
  @IsUUID()
  merchantId: string;

  @ApiProperty({
    description: 'Unique identifier of the outlet',
    format: 'uuid',
  })
  @IsNotEmpty()
  @IsUUID()
  outletId: string;

  @ApiProperty({
    description: 'Name of the outlet',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Menu link for the outlet',
    type: String,
    nullable: true,
  })
  @IsUrl()
  @IsOptional()
  menuLink?: string | null;

  @ApiProperty({
    description: 'Status of the outlet',
    enum: OutletFastPaymentStatusEnum,
  })
  @IsEnum(OutletFastPaymentStatusEnum)
  status: OutletFastPaymentStatusEnum;
}
