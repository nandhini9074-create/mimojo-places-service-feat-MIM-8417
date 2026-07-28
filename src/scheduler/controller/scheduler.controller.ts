import { Controller, Post } from "@nestjs/common";
import { ScheduleService } from "../service/schedule.service";

@Controller('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Post()
  async unMapExpiredOutlets() {
    await this.scheduleService.unMapExpiringOutletsFromProfile();
  }
}