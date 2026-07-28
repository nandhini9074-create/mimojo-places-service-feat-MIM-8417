import { Test, TestingModule } from '@nestjs/testing';
import { ScheduleService } from 'src/scheduler/service/schedule.service';
import { ScheduleController } from '../scheduler.controller';

describe('ScheduleController', () => {
  let controller: ScheduleController;
  let service: ScheduleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScheduleController],
      providers: [
        {
          provide: ScheduleService,
          useValue: {
            unMapExpiringOutletsFromProfile: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ScheduleController>(ScheduleController);
    service = module.get<ScheduleService>(ScheduleService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  it('should call unMapExpiringOutletsFromProfile when unMapExpiredOutlets is called', async () => {
    await controller.unMapExpiredOutlets();

    expect(service.unMapExpiringOutletsFromProfile).toHaveBeenCalledTimes(1);
  });
});
