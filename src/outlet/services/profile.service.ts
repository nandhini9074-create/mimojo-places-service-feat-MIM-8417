import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ErrorMessages } from 'src/errors/error-messages';
import { ProfileDto } from '../dtos/profile-dto';
import { Profile } from '../models/profile.model';
import { PaginationDto } from 'src/common/dtos/pagenation.dto';
import { SortDto } from 'src/common/dtos/sort.dto';
import { buildQueryOptions } from 'src/common/helpers/query-utils';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';
import { Op, Transaction } from 'sequelize';

@Injectable()
export class ProfileService {
  constructor(
    @InjectModel(Profile)
    private readonly profile: typeof Profile,
    private readonly logger: CustomPinoLogger
  ) {}

  async create(profileDto: ProfileDto, transaction?: Transaction) {
    this.logger.info('ProfileService.create method called', {
      data: profileDto,
    });
    try {
      return await this.profile.create(profileDto, { transaction });
    } catch (error) {
      this.logger.error('ProfileService.create method error', { error });
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new HttpException(ErrorMessages.profileMapping.profileAlreadyExist, HttpStatus.BAD_REQUEST);
      }
      throw new HttpException(ErrorMessages.profileMapping.profileAlreadyExist, HttpStatus.BAD_REQUEST);
    }
  }

  async updateById(profileDto: ProfileDto, transaction?: Transaction) {
    this.logger.info('ProfileService.update method called', {
      data: profileDto,
    });
    try {
      return await this.profile.update(profileDto, {
        where: {
          id: profileDto.profileId,
        },
        returning: true,
        transaction,
      });
    } catch (error) {
      this.logger.error('ProfileService.update method error', { error });
      throw new HttpException(ErrorMessages.profileMapping.profileUpdateFailed, HttpStatus.BAD_REQUEST);
    }
  }

  async deleteByProfileId(profileId: string, transaction?: Transaction) {
    this.logger.info('ProfileService.delete method called', { profileId });
    try {
      return await this.profile.destroy({
        where: { id: profileId },
        transaction,
      });
    } catch (error) {
      this.logger.error('ProfileService.delete method error', { error });
      throw new HttpException(ErrorMessages.profileMapping.profileDeletionFailed, HttpStatus.BAD_REQUEST);
    }
  }

  async findAll() {
    this.logger.info('ProfileService.findAll method called');
    try {
      return await this.profile.findAll();
    } catch (error) {
      this.logger.error('ProfileService.findAll method error', { error });
    }
  }

  async findOne(profileId: string) {
    this.logger.info('ProfileService.findOne method called', { profileId });
    try {
      return await this.profile.findOne({
        where: { id: profileId },
      });
    } catch (error) {
      this.logger.error('ProfileService.findOne method error', { error });
    }
  }

  async findByName(profileName: string) {
    this.logger.info('ProfileService.findByName method called', { profileName });
    try {
      return await this.profile.findOne({
        where: { name: profileName },
      });
    } catch (error) {
      this.logger.error('ProfileService.findByName method error', { error });
    }
  }

  async findByNames(profileNames: string[]) {
    this.logger.info('ProfileService.findByName method called', { profileNames });
    try {
      return await this.profile.findAll({
        where: { name: { [Op.in]: profileNames } },
        attributes: ['id'],
        raw: true,
      });
    } catch (error) {
      this.logger.error('ProfileService.findByName method error', { error });
    }
  }

  async getAllProfiles(sortDto?: SortDto, paginationDto?: PaginationDto, searchQuery?: string) {
    try {
      const query = buildQueryOptions({
        paginationDto: paginationDto,
        sortDto: sortDto,
        searchQuery: searchQuery,
      });
      return await this.profile.findAll(query);
    } catch (error) {
      this.logger.error('ProfileService.getAllProfiles error', { error });
    }
  }

  async getPaydayProfiles() {
    try {
      return await this.profile.findAll({
        where: { allowPayday: true, isActive: true },
        attributes: ['id', 'name'],
        order: [['createdAt', 'DESC']],
      });
    } catch (error) {
      this.logger.error('ProfileService.getPaydayProfiles error', { error });
    }
  }
}
