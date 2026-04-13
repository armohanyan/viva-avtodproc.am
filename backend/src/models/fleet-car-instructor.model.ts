import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';

export class FleetCarInstructor extends Model<
  InferAttributes<FleetCarInstructor>,
  InferCreationAttributes<FleetCarInstructor>
> {
  declare carId: string;
  declare instructorUserId: string;
}

FleetCarInstructor.init(
  {
    carId: { type: DataTypes.STRING(64), primaryKey: true },
    instructorUserId: { type: DataTypes.STRING(64), primaryKey: true },
  },
  { sequelize, tableName: 'fleet_car_instructors', modelName: 'FleetCarInstructor' },
);
