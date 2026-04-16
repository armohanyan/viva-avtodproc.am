import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk } from './auto-id';

export class Blog extends Model<InferAttributes<Blog>, InferCreationAttributes<Blog>> {
  declare id: CreationOptional<number>;
  declare slug: string;
  declare title: string;
  declare excerpt: string;
  declare bodyHtml: string;
  declare coverImage: CreationOptional<string | null>;
  declare published: boolean;
  declare publishedAt: Date;
}

Blog.init(
  {
    id: autoIncrementPk(),
    slug: { type: DataTypes.STRING(160), allowNull: false, unique: true },
    title: { type: DataTypes.STRING(512), allowNull: false },
    excerpt: { type: DataTypes.TEXT, allowNull: false },
    bodyHtml: { type: DataTypes.TEXT('long'), allowNull: false },
    coverImage: { type: DataTypes.TEXT, allowNull: true },
    published: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    publishedAt: { type: DataTypes.DATE, allowNull: false },
  },
  { sequelize, tableName: 'blogs', modelName: 'Blog' },
);
