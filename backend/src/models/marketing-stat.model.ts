import { DataTypes, Model, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';

export class MarketingStat extends Model<InferAttributes<MarketingStat>, InferCreationAttributes<MarketingStat>> {
  declare statKey: string;
  declare value: string;
  declare sortOrder: number;
}

MarketingStat.init(
  {
    statKey: { type: DataTypes.STRING(32), primaryKey: true },
    value: { type: DataTypes.STRING(64), allowNull: false },
    sortOrder: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  },
  { sequelize, tableName: 'marketing_stats', modelName: 'MarketingStat' },
);
