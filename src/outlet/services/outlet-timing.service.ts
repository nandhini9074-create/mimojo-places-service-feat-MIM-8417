import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { FindOptions, Transaction } from 'sequelize';
import { OutletTiming } from '../models/outlet-timing.model';
import { CreateOutletTimingDto } from '../dtos/create-outlet-timing-dto';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';

@Injectable()
export class OutletTimingService {
  private readonly serviceName = 'OutletTimingService';
  constructor(
    @InjectModel(OutletTiming)
    private readonly outletTimingModel: typeof OutletTiming,
    private readonly logger: CustomPinoLogger
  ) {}

  async insert(
    outlet_id: string,
    timingDto: CreateOutletTimingDto,
    transaction: Transaction,
    userId: string
  ): Promise<OutletTiming> {
    if (timingDto?.weekdayText) {
      const jsonArray = timingDto?.weekdayText?.map(obj => JSON.parse(JSON.stringify(obj)));

      const jsonArrayAr = timingDto?.weekdayTextAr?.map(obj => JSON.parse(JSON.stringify(obj)));

      await this.update_inactive(outlet_id, transaction, userId);
      return await this.outletTimingModel.create(
        {
          outletId: outlet_id,
          weekdayText: jsonArray,
          weekdayTextAr: jsonArrayAr ?? jsonArray,
          isActive: true,
          updatedBy: userId,
        },
        { transaction }
      );
    }
  }

  async cloneTiming(
    outlet_id: string,
    transaction: Transaction,
    userId: string,
    existingOutletId: string
  ): Promise<OutletTiming> {
    const methodName = 'cloneTiming';
    this.logger.info(`${this.serviceName}.${methodName} - starts`, { outlet_id, userId, existingOutletId });
    try {
      const existingTimimg = await this.outletTimingModel.findOne({
        where: {
          outletId: existingOutletId,
          isActive: true,
        },
        raw: true,
      });
      if (existingTimimg?.weekdayText) {
        await this.update_inactive(outlet_id, transaction, userId);
        return await this.outletTimingModel.create(
          {
            outletId: outlet_id,
            weekdayText: existingTimimg.weekdayText,
            weekdayTextAr: existingTimimg.weekdayTextAr ?? existingTimimg.weekdayText,
            isActive: true,
            updatedBy: userId,
          },
          { transaction }
        );
      }

      this.logger.info(`${this.serviceName}.${methodName} - completed`);
    } catch (error) {
      this.logger.error(`${this.serviceName}.${methodName} - exception`, { error });
      throw new HttpException(
        error?.response?.data?.message ?? error?.message ?? 'Error in cloning outlet timing',
        error?.response?.status ?? error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async update_inactive(outlet_id: string, transaction: Transaction, userId: string) {
    const [, [updatedUser]] = await this.outletTimingModel.update(
      { isActive: false, updatedBy: userId },
      {
        where: { outletId: outlet_id },
        returning: true,
        transaction: transaction,
      }
    );

    return updatedUser;
  }

  async update_timing(outlet_timing_id: string, timing: { day: string; time: string }[]) {
    const response = await this.outletTimingModel.update(
      { weekdayText: timing as unknown as JSON[] },
      {
        where: { outletTimingId: outlet_timing_id },
      }
    );
    return response;
  }

  find(outlet_id: string): Promise<OutletTiming> {
    const userOptions: FindOptions<OutletTiming> = {
      where: {
        outletId: outlet_id,
      },
    };
    return this.outletTimingModel.findOne(userOptions);
  }

  async migrateTiming() {
    const outletTimings = await this.outletTimingModel.findAll({});
    for (const outletTiming of outletTimings) {
      try {
        const output = {
          time: outletTiming.weekdayText.map(item => {
            if (item && item['start'] && item['end']) {
              const timeRange = `${item['start']} - ${item['end']}`;
              return { day: item['day'], time: timeRange };
            }
          }),
          id: outletTiming.outletTimingId,
        };
        const allUndefined = output.time.every(item => item === undefined);
        if (!allUndefined) {
          console.log(output);
          await this.update_timing(output.id, output.time);
        }
      } catch (ex) {
        this.logger.error('OutletTimingService.migrateTiming method error', { ex });
      }
    }
    return { status: 'success' };
  }
}
