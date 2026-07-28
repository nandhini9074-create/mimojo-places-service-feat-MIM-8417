import { IsOptional, IsArray, IsString, IsNotEmpty } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotBlank } from "../decorator/isNotBlank.validator";

export class CreateOutletTimingDto {
  @ApiPropertyOptional({
    description: "List of weekday timings in English",
    type: () => [CreateOutletWeekdayDto],
    example: [
      { day: "Monday", start: "09:00", end: "18:00" },
      { day: "Tuesday", start: "09:00", end: "18:00" },
    ],
  })
  @IsArray()
  @IsOptional()
  weekdayText: CreateOutletWeekdayDto[];

  @ApiPropertyOptional({
    description: "List of weekday timings in Arabic",
    type: () => [CreateOutletWeekdayDto],
    example: [
      { day: "الإثنين", start: "٠٩:٠٠", end: "١٨:٠٠" },
      { day: "الثلاثاء", start: "٠٩:٠٠", end: "١٨:٠٠" },
    ],
  })
  @IsArray()
  @IsOptional()
  weekdayTextAr: CreateOutletWeekdayDto[];
}

export class CreateOutletWeekdayDto {
  @ApiProperty({
    description: "Day of the week",
    example: "Monday",
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @IsNotBlank()
  day: string;

  @ApiProperty({
    description: "Start time in HH:mm format",
    example: "09:00",
    maxLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @IsNotBlank()
  start: string;

  @ApiProperty({
    description: "End time in HH:mm format",
    example: "18:00",
    maxLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @IsNotBlank()
  end: string;
}
