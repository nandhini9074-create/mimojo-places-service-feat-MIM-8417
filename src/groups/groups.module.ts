import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
 import { Merchant } from 'src/merchant/entities/merchant.model';
import { Group } from './entities/group.model';
import { GroupService } from './services/group.service';
import { GroupsController } from './controllers/groups.controller';
 import { GroupMerchantService } from 'src/merchant/shared/group-merchant.service';
import { AuthHeaderService } from 'src/auth/services/auth.validator.service';
import { CustomLoggerModule } from 'src/logger/logger.module';

@Module({
  imports: [SequelizeModule.forFeature([Group,
      Merchant
    ]), CustomLoggerModule],
  exports: [GroupService, AuthHeaderService],
  providers: [GroupService,
      GroupMerchantService,
      AuthHeaderService],
  controllers: [GroupsController]
})
export class GroupModule {}
