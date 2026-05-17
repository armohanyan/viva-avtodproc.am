import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk, fkUnsignedInt, fkUnsignedIntNullable } from './auto-id';

export const PERSONAL_THEORY_LESSON_REQUEST_STATUSES = [
  'pending',
  'contacted',
  'booked',
  'cancelled',
] as const;

export type PersonalTheoryLessonRequestStatus = (typeof PERSONAL_THEORY_LESSON_REQUEST_STATUSES)[number];

export class PersonalTheoryLessonRequest extends Model<
  InferAttributes<PersonalTheoryLessonRequest>,
  InferCreationAttributes<PersonalTheoryLessonRequest>
> {
  declare id: CreationOptional<number>;
  declare studentUserId: number;
  declare instructorUserId: number;
  declare branchId: number;
  declare note: CreationOptional<string | null>;
  declare selectedThemes: CreationOptional<string[] | null>;
  declare status: PersonalTheoryLessonRequestStatus;
  declare bookedLessonId: CreationOptional<number | null>;
  declare handledByAdminId: CreationOptional<number | null>;
  declare contactedAt: CreationOptional<Date | null>;
  declare cancelledAt: CreationOptional<Date | null>;
  declare bookedAt: CreationOptional<Date | null>;
}

PersonalTheoryLessonRequest.init(
  {
    id: autoIncrementPk(),
    studentUserId: fkUnsignedInt(),
    instructorUserId: fkUnsignedInt(),
    branchId: fkUnsignedInt(),
    note: { type: DataTypes.TEXT, allowNull: true },
    selectedThemes: { type: DataTypes.JSON, allowNull: true },
    status: {
      type: DataTypes.ENUM(...PERSONAL_THEORY_LESSON_REQUEST_STATUSES),
      allowNull: false,
      defaultValue: 'pending',
    },
    bookedLessonId: fkUnsignedIntNullable(),
    handledByAdminId: fkUnsignedIntNullable(),
    contactedAt: { type: DataTypes.DATE, allowNull: true },
    cancelledAt: { type: DataTypes.DATE, allowNull: true },
    bookedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    tableName: 'personal_theory_lesson_requests',
    modelName: 'PersonalTheoryLessonRequest',
    timestamps: true,
    indexes: [
      { fields: ['student_user_id', 'status'] },
      { fields: ['instructor_user_id', 'status'] },
      { fields: ['status', 'created_at'] },
    ],
  },
);
