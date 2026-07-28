import { IsEnum, IsNotEmpty, IsUUID } from "class-validator";
import { OutletProfileStatusEnum } from "../enums/outlet-profile-enum";
import { ApiProperty } from "@nestjs/swagger";

 export class UpdateOutletProfileStatusDto {
    @ApiProperty({
      description: 'Unique identifier of the outlet',
      example: '9f7c6f6a-3d2f-4b65-9e8e-123456789abc',
      format: 'uuid',
    })
    @IsNotEmpty()
    @IsUUID()
    outletId: string;

    @ApiProperty({
      description: 'Unique identifier of the outlet profile',
      example: '5f7c6f6a-3d2f-4b65-9e8e-abcdef987654',
      format: 'uuid',
    })
    @IsNotEmpty()
    @IsUUID()
    profileId: string;

    @ApiProperty({
      description: 'Status of the outlet profile',
      enum: OutletProfileStatusEnum,
      enumName: 'OutletProfileStatusEnum'
    })
    @IsNotEmpty()
    @IsEnum(OutletProfileStatusEnum)
    status: OutletProfileStatusEnum;
  }