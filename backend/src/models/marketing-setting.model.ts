import { DataTypes, Model, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';

/** Key–value store for contact, footer address, social URLs, optional primary tel/mailto. */
export class MarketingSetting extends Model<InferAttributes<MarketingSetting>, InferCreationAttributes<MarketingSetting>> {
  declare settingKey: string;
  declare valueText: string;
}

MarketingSetting.init(
  {
    settingKey: { type: DataTypes.STRING(64), primaryKey: true },
    valueText: { type: DataTypes.TEXT, allowNull: false },
  },
  { sequelize, tableName: 'marketing_settings', modelName: 'MarketingSetting', underscored: true },
);
