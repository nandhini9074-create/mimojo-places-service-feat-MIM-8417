import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Area } from 'src/area/models/area.model';
import { Neighbourhood } from 'src/neighbourhood/models/neighbourhood.model';
import { neighbourhoods } from '../initial-data/neighbourhood';

@Injectable()
export class SeederNeighbourhoodService {
  constructor(
    @InjectModel(Area) private readonly areaModel: typeof Area,
    @InjectModel(Neighbourhood) private readonly neighbourhoodModel: typeof Neighbourhood
  ) {}

  async createNeighbourhoodSeeder(): Promise<void> {
    for (let i = 0; i < neighbourhoods.length; i++) {
      const areaName = neighbourhoods[i]['area'];
      const [area] = await this.areaModel.findOrCreate({
        where: {
          areaName: areaName,
        },
        defaults: {
          areaName: areaName,
        },
        returning: true,
      });
      for (let j = 0; j < neighbourhoods[i]['neighbourhood'].length; j++) {
        const name = neighbourhoods[i]['neighbourhood'][j].name;
        await this.neighbourhoodModel.findOrCreate({
          where: {
            areaId: area.areaId,
            neighbourhoodName: name,
          },
          defaults: {
            areaId: area.areaId,
            neighbourhoodName: name,
          },
          returning: false,
        });
      }
    }
  }
}
