import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk } from './auto-id';

/** Key–value store for application settings (slot plans, etc.). */
export class AppSetting extends Model<InferAttributes<AppSetting>, InferCreationAttributes<AppSetting>> {
  declare id: CreationOptional<number>;
  declare settingKey: string;
  declare valueText: string;
}

AppSetting.init(
  {
    id: autoIncrementPk(),
    settingKey: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    valueText: { type: DataTypes.TEXT, allowNull: false },
  },
  { sequelize, tableName: 'app_settings', modelName: 'AppSetting', underscored: true },
);
