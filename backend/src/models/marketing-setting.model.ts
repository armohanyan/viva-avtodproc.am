import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk } from './auto-id';

/** Key–value store for contact, footer address, social URLs, optional primary tel/mailto. */
export class MarketingSetting extends Model<InferAttributes<MarketingSetting>, InferCreationAttributes<MarketingSetting>> {
  declare id: CreationOptional<number>;
  declare settingKey: string;
  declare valueText: string;
}

MarketingSetting.init(
  {
    id: autoIncrementPk(),
    settingKey: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    valueText: { type: DataTypes.TEXT, allowNull: false },
  },
  { sequelize, tableName: 'marketing_settings', modelName: 'MarketingSetting', underscored: true },
);
