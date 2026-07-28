import { Module } from '@nestjs/common';
import { ScheduleService } from './service/schedule.service';
import { ScheduleController } from './controller/scheduler.controller';
import { CustomLoggerModule } from 'src/logger/logger.module';
import { OutletModule } from 'src/outlet/outlet.module';

@Module({
  controllers: [ScheduleController],
  imports: [CustomLoggerModule, OutletModule],
  providers: [ScheduleService],
})
export class SchedulerModule {}
