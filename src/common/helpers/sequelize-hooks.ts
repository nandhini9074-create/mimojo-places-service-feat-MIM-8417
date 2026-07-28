import { Model, ModelStatic } from 'sequelize';
import { SequelizeHooks } from 'sequelize/types/hooks';
import { DataOperationsProducer } from 'src/kafka-services/data-operations.producer';

class SequelizeHooksHandler {
  hooks: Partial<SequelizeHooks>;

  constructor(private readonly dataOperationsProducer: DataOperationsProducer) {
    this.hooks = {
      afterCreate: this.afterCreate.bind(this),
      afterBulkCreate: this.afterBulkCreate.bind(this),
      beforeUpdate: this.beforeUpdate.bind(this),
      beforeBulkUpdate: this.beforeBulkUpdate.bind(this),
      beforeUpsert: this.beforeUpsert.bind(this),
      afterDestroy: this.afterDestroy.bind(this),
      afterBulkDestroy: this.afterBulkDestroy.bind(this),
    };
  }

  private async afterCreate(instance: Model) {
    if (instance?.dataValues) {
      this.pushOrganizedData(instance?.constructor?.name, 'AFTERCREATE', [], [instance?.dataValues]);
    }
  }

  private async afterBulkCreate(instance: Model, options: Record<string, unknown>) {
    if (instance) {
      this.pushOrganizedData((options?.model as ModelStatic<Model>)?.name, 'AFTERBULKCREATE', [], [instance]);
    }
  }

  private async beforeUpdate(instance: Model) {
    if (instance?.dataValues) {
      this.pushOrganizedData(
        instance?.constructor?.name,
        'BEFOREUPDATE',
        [instance?.['_previousDataValues']],
        [instance?.dataValues]
      );
    }
  }

  private async beforeBulkUpdate(options: Record<string, unknown>) {
    const model = options?.model as ModelStatic<Model>;
    const modelData = await model?.findAll({ where: options.where as Record<string, unknown> });
    const previousValues = modelData?.map((data: Model) => data.get({ plain: true }));
    const updatedValues = options?.attributes as Record<string, unknown>;
    previousValues.forEach((prev: Record<string, unknown>) => {
      const current = { ...prev, ...updatedValues };
      this.pushOrganizedData(model?.name, 'BEFOREBULKUPDATE', [prev], [current]);
    });
  }

  private async beforeUpsert(instance: Model, options: Record<string, unknown>) {
    const model = options?.model as ModelStatic<Model>;
    const primaryKeyFields = options?.fields as string[];
    const whereCondition: Record<string, unknown> = {};
    const instanceData = options?.instance as Model;
    for (const key of primaryKeyFields) {
      whereCondition[key] = instanceData?.dataValues[key];
    }
    const existingData = await model.findOne({ where: whereCondition });
    if (existingData) {
      const previousValues = existingData?.dataValues;
      const currentValues = { ...previousValues, ...instance };
      this.pushOrganizedData(model?.name, 'BEFOREUPSERT', [previousValues], [currentValues]);
    } else {
      this.pushOrganizedData(model?.name, 'BEFOREUPSERT', [], [instanceData?.dataValues]);
    }
  }

  private async afterDestroy(instance: Model) {
    if (instance?.dataValues) {
      this.pushOrganizedData(instance?.constructor?.name, 'AFTERDESTROY', [], [instance?.dataValues]);
    }
  }

  private async afterBulkDestroy(options: Record<string, unknown>) {
    const model = options.model as ModelStatic<Model>;
    const modelData = await model.findAll({ where: options.where as Record<string, unknown> });
    if (modelData?.length > 0) {
      this.pushOrganizedData(model?.name, 'AFTERBULKDESTROY', [], modelData);
    }
  }

  private pushOrganizedData(modelName: string, action: string, previousValues: unknown[], currentValues: unknown[]) {
    this.dataOperationsProducer.pushToAuditLogService(
      'mimojo-places-service',
      {
        modelName,
        action,
        previousValues,
        currentValues,
      },
      null
    );
  }

  getHooks(): Partial<SequelizeHooks> {
    return this.hooks;
  }
}

export default SequelizeHooksHandler;
