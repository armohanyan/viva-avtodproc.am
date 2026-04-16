import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk } from './auto-id';

export class MarketingTestimonial extends Model<
  InferAttributes<MarketingTestimonial>,
  InferCreationAttributes<MarketingTestimonial>
> {
  declare id: CreationOptional<number>;
  declare authorName: string;
  declare quote: string;
  declare rating: number;
  declare sortOrder: number;
  declare published: boolean;
}

MarketingTestimonial.init(
  {
    id: autoIncrementPk(),
    authorName: { type: DataTypes.STRING(255), allowNull: false },
    quote: { type: DataTypes.TEXT, allowNull: false },
    rating: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 5 },
    sortOrder: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    published: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { sequelize, tableName: 'marketing_testimonials', modelName: 'MarketingTestimonial', underscored: true },
);
