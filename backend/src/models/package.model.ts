import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk } from './auto-id';

export class Package extends Model<InferAttributes<Package>, InferCreationAttributes<Package>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare priceDisplay: string;
  /** Practical (in-car) lessons included in the package. */
  declare lessons: number;
  /** Theory classroom / course sessions included in the package. */
  declare theoryLessons: CreationOptional<number>;
  declare status: string;
  declare featuresJson: string;
  declare imageUrl: CreationOptional<string | null>;
}

Package.init(
  {
    id: autoIncrementPk(),
    name: { type: DataTypes.STRING(255), allowNull: false },
    priceDisplay: { type: DataTypes.STRING(64), allowNull: false },
    lessons: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    theoryLessons: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'active' },
    featuresJson: { type: DataTypes.TEXT, allowNull: false, defaultValue: '[]' },
    imageUrl: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, tableName: 'packages', modelName: 'Package' },
);
