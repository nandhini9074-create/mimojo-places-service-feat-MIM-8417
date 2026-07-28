import { IsInt, Min } from "class-validator";

export class UpdateMerchantProfileOutletsNumberDto {
    @IsInt()
    @Min(0)
    activeOutletsNum: number;

    @IsInt()
    @Min(0)
    inActiveOutletsNum: number;
}