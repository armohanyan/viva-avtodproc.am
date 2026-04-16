import { DataTypes, Model, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { fkUnsignedInt } from './auto-id';

/** Car ↔ instructor M:N — legacy table has no surrogate `id`; uniqueness is `(car_id, instructor_user_id)`. */
export class FleetCarInstructor extends Model<
  InferAttributes<FleetCarInstructor>,
  InferCreationAttributes<FleetCarInstructor>
> {
  declare carId: number;
  declare instructorUserId: number;
}

FleetCarInstructor.init(
  {
    carId: { ...fkUnsignedInt(), primaryKey: true },
    instructorUserId: { ...fkUnsignedInt(), primaryKey: true },
  },
  { sequelize, tableName: 'fleet_car_instructors', modelName: 'FleetCarInstructor' },
);
