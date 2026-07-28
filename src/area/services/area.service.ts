import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Area } from 'src/area/models/area.model';
import { Neighbourhood } from '../../neighbourhood/models/neighbourhood.model';
import { GooglePlacesService } from 'src/google-places/services/google-places.service';
import { UpsertNeighbourhoodDto } from '../../neighbourhood/dtos/upsert-neighbourhood-dto';
import { Transaction } from 'sequelize';
import { HttpStatusCode } from 'axios';
import { IInternalApiConfig } from 'config/interface';
import { ConfigService } from '@nestjs/config';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';

@Injectable()
export class AreaService {
  private readonly qatarCityId: string;
  constructor(
    @InjectModel(Area)
    private readonly areaModel: typeof Area,
    @InjectModel(Neighbourhood)
    private readonly neightbourhoodModel: typeof Neighbourhood,
    private readonly googlePlacesService: GooglePlacesService,
    private readonly configService: ConfigService,
    private readonly logger: CustomPinoLogger
  ) {
    const { QATAR_CITY_ID } = this.configService.get<IInternalApiConfig>('internal-apis');
    this.qatarCityId = QATAR_CITY_ID;
  }

  async findAreas() {
    const parents = await this.areaModel.findAll({
      attributes: [['area_id', 'cityId'], ['area_name', 'city'], 'isDefault'],
      include: [
        {
          model: Neighbourhood,
          attributes: ['neighbourhoodId', ['neighbourhood_name', 'neighbourhood']],
          required: false,
          nested: true,
        },
      ],
      where: {
        isVirtual: false,
      },
      order: [
        ['area_name', 'ASC'],
        ['Neighbourhoods', 'neighbourhood_name', 'ASC'],
      ],
    });
    const result = parents.map(parent => parent.toJSON());
    return result;
  }

  async findAllAreas() {
    const parents = await this.areaModel.findAll({
      attributes: [['area_id', 'cityId'], ['area_name', 'city'], 'isDefault'],
      include: [
        {
          model: Neighbourhood,
          attributes: [
            'neighbourhoodId',
            ['neighbourhood_name', 'neighbourhood'],
            ['neighbourhood_name_ar', 'neighbourhoodAr'],
          ],
          required: false,
          nested: true,
        },
      ],
      order: [
        ['area_name', 'ASC'],
        ['Neighbourhoods', 'neighbourhood_name', 'ASC'],
      ],
    });
    const result = parents.map(parent => parent.toJSON());
    return result;
  }

  async findCities() {
    const parents = await this.areaModel.findAll({
      attributes: [['area_id', 'id'], ['area_name', 'city'], 'isDefault'],
      order: [['area_name', 'ASC']],
      where: {
        isVirtual: false,
      },
    });
    const result = parents.map(parent => parent.toJSON());
    return result;
  }

  async findAllCities() {
    const parents = await this.areaModel.findAll({
      attributes: [['area_id', 'id'], ['area_name', 'city'], 'isDefault'],
      order: [['area_name', 'ASC']],
    });
    const result = parents.map(parent => parent.toJSON());
    return result;
  }

  async findAllCityNames() {
    const cities = await this.areaModel.findAll({
      attributes: [
        ['area_id', 'id'],
        ['area_name', 'name'],
      ],
      order: [['area_name', 'ASC']],
    });
    return cities;
  }

  private async getCitiesWithCoordinatesDefaultBase(
    lat: number,
    lng: number,
    preferredLanguage: string
  ): Promise<Record<string, unknown>[]> {
    const parents = await this.areaModel.findAll({
      attributes: [['area_id', 'id'], ['area_name', 'city'], 'area_name_ar', 'isDefault'],
      order: [['area_name', 'ASC']],
      where: {
        isVirtual: false,
      },
    });
    const result = parents.map(parent => {
      const areaJson = parent.toJSON();
      if (areaJson['city'] === 'Abu Dhabi') {
        console.log('area name ', areaJson['city'], areaJson['area_name_ar']);
      }
      areaJson['city'] =
        preferredLanguage === 'ar' && areaJson['area_name_ar'] ? areaJson['area_name_ar'] : areaJson['city'];

      delete areaJson['area_name_ar'];
      return areaJson;
    });

    if (lat && lng) {
      await this.updateDefaultCity(lat, lng, result);
    }

    return result;
  }

  async findCitiesWithCoordicatesDefault(lat: number, lng: number, preferredLanguage: string) {
    const result = await this.getCitiesWithCoordinatesDefaultBase(lat, lng, preferredLanguage);
    // Remove Qatar city from the result
    this.removeQatarCity(result);
    return result;
  }

  private removeQatarCity(result: Record<string, unknown>[]) {
    const cityIdToRemove = this.qatarCityId;
    const index = result.findIndex(city => city.id === cityIdToRemove);
    if (index !== -1) {
      result.splice(index, 1);
    }
  }

  async findCitiesWithCoordicatesDefaultIncludingQatar(lat: number, lng: number, preferredLanguage: string) {
    return this.getCitiesWithCoordinatesDefaultBase(lat, lng, preferredLanguage);
  }

  private async updateDefaultCity(lat: number, lng: number, result: Record<string, unknown>[]) {
    const currentCity = await this.googlePlacesService.getCityNameFromCoordinates(lat, lng);
    // Find the city in the second array based on the match in the first array
    const matchingCity = result?.find(item => currentCity?.includes(item['city'] as string));

    // Mark the matching city as the default city
    if (matchingCity) {
      result.forEach(item => {
        item.isDefault = item === matchingCity;
      });
    }
  }

  async findById(areaId: string) {
    const result = await this.areaModel.findOne({
      attributes: [['area_id', 'cityId'], ['area_name', 'city'], 'isDefault'],
      where: {
        areaId: areaId,
      },
    });
    return result;
  }

  async upsertNeighbourhood(request: UpsertNeighbourhoodDto, transaction: Transaction) {
    try {
      if (request.neighbourhoodId) {
        await this.neightbourhoodModel.update(
          {
            neighbourhoodName: request.neighbourhoodName,
            neighbourhoodNameAr: request.neighbourhoodNameAr ?? request.neighbourhoodName,
          },
          { where: { neighbourhoodId: request.neighbourhoodId }, transaction }
        );
        return { message: 'Neighbourhood updated successfully' };
      }
      await this.neightbourhoodModel.create(
        {
          neighbourhoodName: request.neighbourhoodName,
          neighbourhoodNameAr: request.neighbourhoodNameAr ?? request.neighbourhoodName,
          areaId: request.areaId,
        },
        { transaction }
      );
      return { message: 'Neighbourhood created successfully' };
    } catch (error) {
      this.logger.error('AreaService.upsertNeighbourhood - exception', { error, request });
      throw new HttpException('Something went wrong while updating neighbourhood', HttpStatusCode.InternalServerError);
    }
  }
}
