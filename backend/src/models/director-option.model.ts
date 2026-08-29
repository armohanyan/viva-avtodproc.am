import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import type { DirectorOptionCategory } from '../constants/director-option-category';
import { DIRECTOR_OPTION_CATEGORIES } from '../constants/director-option-category';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk } from './auto-id';

export class DirectorOption extends Model<
  InferAttributes<DirectorOption>,
  InferCreationAttributes<DirectorOption>
> {
  declare id: CreationOptional<number>;
  declare category: DirectorOptionCategory;
  declare value: string;
  declare sortOrder: CreationOptional<number>;
}

DirectorOption.init(
  {
    id: autoIncrementPk(),
    category: {
      type: DataTypes.ENUM(...DIRECTOR_OPTION_CATEGORIES),
      allowNull: false,
    },
    value: { type: DataTypes.STRING(255), allowNull: false },
    sortOrder: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  },
  {
    sequelize,
    tableName: 'director_options',
    modelName: 'DirectorOption',
    timestamps: true,
    underscored: true,
    indexes: [{ unique: true, fields: ['category', 'value'] }],
  },
);
