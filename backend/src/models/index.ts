import { QueryTypes } from 'sequelize';
import config from '../config';
import { sequelize } from '../database/sequelize';
import { Blog } from './blog.model';
import { BookedCall } from './booked-call.model';
import { Booking } from './booking.model';
import { Branch } from './branch.model';
import { CarExpense } from './car-expense.model';
import { City } from './city.model';
import { ExamQuestion } from './exam-question.model';
import { FinanceTransaction } from './finance-transaction.model';
import { FleetCar } from './fleet-car.model';
import { FleetCarInstructor } from './fleet-car-instructor.model';
import { InstructorAvailabilityBlock } from './instructor-availability-block.model';
import { InstructorBranch } from './instructor-branch.model';
import { InstructorProfile } from './instructor-profile.model';
import { MarketingSetting } from './marketing-setting.model';
import { MarketingStat } from './marketing-stat.model';
import { MarketingTestimonial } from './marketing-testimonial.model';
import { Package } from './package.model';
import { StudentExtraPractical } from './student-extra-practical.model';
import { StudentProfile } from './student-profile.model';
import { TheoryCohort } from './theory-cohort.model';
import { TheoryCohortEnrollment } from './theory-cohort-enrollment.model';
import { User } from './user.model';
import { RefreshToken } from './refresh-token.model';
import { OAuthAccount } from './oauth-account.model';

City.hasMany(Branch, { foreignKey: 'cityId', sourceKey: 'id' });
Branch.belongsTo(City, { foreignKey: 'cityId', targetKey: 'id' });

User.hasOne(InstructorProfile, { foreignKey: 'userId', sourceKey: 'id', as: 'instructorProfile' });
InstructorProfile.belongsTo(User, { foreignKey: 'userId', targetKey: 'id', as: 'user' });

User.hasOne(StudentProfile, { foreignKey: 'userId', sourceKey: 'id', as: 'studentProfile' });
StudentProfile.belongsTo(User, { foreignKey: 'userId', targetKey: 'id', as: 'studentAccount' });

StudentProfile.belongsTo(Branch, { foreignKey: 'branchId', targetKey: 'id' });
StudentProfile.belongsTo(Package, { foreignKey: 'packageId', targetKey: 'id', as: 'package' });
StudentProfile.belongsTo(User, { foreignKey: 'instructorUserId', targetKey: 'id', as: 'assignedInstructor' });

User.hasMany(InstructorBranch, { foreignKey: 'instructorUserId', sourceKey: 'id' });
Branch.hasMany(InstructorBranch, { foreignKey: 'branchId', sourceKey: 'id' });
InstructorBranch.belongsTo(User, { foreignKey: 'instructorUserId', targetKey: 'id' });
InstructorBranch.belongsTo(Branch, { foreignKey: 'branchId', targetKey: 'id' });

User.hasMany(InstructorAvailabilityBlock, { foreignKey: 'instructorUserId', sourceKey: 'id' });
InstructorAvailabilityBlock.belongsTo(User, { foreignKey: 'instructorUserId', targetKey: 'id' });

Booking.belongsTo(User, { foreignKey: 'studentUserId', targetKey: 'id', as: 'student' });
Booking.belongsTo(User, { foreignKey: 'instructorUserId', targetKey: 'id', as: 'instructor' });
Booking.belongsTo(Branch, { foreignKey: 'branchId', targetKey: 'id' });

Booking.hasMany(FinanceTransaction, { foreignKey: 'bookingId', sourceKey: 'id', as: 'financeTransactions' });
FinanceTransaction.belongsTo(Booking, { foreignKey: 'bookingId', targetKey: 'id', as: 'booking' });

FleetCar.hasMany(CarExpense, { foreignKey: 'carId', sourceKey: 'id' });
CarExpense.belongsTo(FleetCar, { foreignKey: 'carId', targetKey: 'id' });

FleetCar.hasMany(FleetCarInstructor, { foreignKey: 'carId', sourceKey: 'id' });
User.hasMany(FleetCarInstructor, { foreignKey: 'instructorUserId', sourceKey: 'id' });
FleetCarInstructor.belongsTo(FleetCar, { foreignKey: 'carId', targetKey: 'id' });
FleetCarInstructor.belongsTo(User, { foreignKey: 'instructorUserId', targetKey: 'id', as: 'user' });

TheoryCohort.hasMany(TheoryCohortEnrollment, { foreignKey: 'cohortId', sourceKey: 'id' });
TheoryCohortEnrollment.belongsTo(TheoryCohort, { foreignKey: 'cohortId', targetKey: 'id' });
TheoryCohortEnrollment.belongsTo(User, { foreignKey: 'studentUserId', targetKey: 'id', as: 'student' });

User.hasMany(StudentExtraPractical, { foreignKey: 'userId', sourceKey: 'id' });
StudentExtraPractical.belongsTo(User, { foreignKey: 'userId', targetKey: 'id' });

User.hasMany(RefreshToken, { foreignKey: 'userId', sourceKey: 'id' });
RefreshToken.belongsTo(User, { foreignKey: 'userId', targetKey: 'id' });
User.hasMany(OAuthAccount, { foreignKey: 'userId', sourceKey: 'id' });
OAuthAccount.belongsTo(User, { foreignKey: 'userId', targetKey: 'id' });

FinanceTransaction.belongsTo(Branch, { foreignKey: 'branchId', targetKey: 'id' });

export {
  Blog,
  BookedCall,
  Booking,
  Branch,
  CarExpense,
  City,
  ExamQuestion,
  FinanceTransaction,
  FleetCar,
  FleetCarInstructor,
  InstructorAvailabilityBlock,
  InstructorBranch,
  InstructorProfile,
  MarketingSetting,
  MarketingStat,
  MarketingTestimonial,
  OAuthAccount,
  Package,
  RefreshToken,
  StudentExtraPractical,
  StudentProfile,
  TheoryCohort,
  TheoryCohortEnrollment,
  User,
};

/** Adds `users.is_active` when the table predates the Sequelize model field (sync without alter skips new columns). */
async function ensureUsersIsActiveColumn(): Promise<void> {
  if (sequelize.getDialect() !== 'mysql') {
    return;
  }
  const rows = await sequelize.query<{ COLUMN_NAME: string }>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_active'`,
    { type: QueryTypes.SELECT },
  );
  if (rows.length > 0) {
    return;
  }
  const tableRows = await sequelize.query<{ TABLE_NAME: string }>(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'`,
    { type: QueryTypes.SELECT },
  );
  if (tableRows.length === 0) {
    return;
  }
  await sequelize.query(
    'ALTER TABLE `users` ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1',
  );
}

/** Adds `finance_transactions.booking_id` when the table predates the Sequelize field (sync without alter skips new columns). */
async function ensureFinanceTransactionsBookingIdColumn(): Promise<void> {
  if (sequelize.getDialect() !== 'mysql') {
    return;
  }
  const colRows = await sequelize.query<{ COLUMN_NAME: string }>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'finance_transactions' AND COLUMN_NAME = 'booking_id'`,
    { type: QueryTypes.SELECT },
  );
  if (colRows.length > 0) {
    return;
  }
  const tableRows = await sequelize.query<{ TABLE_NAME: string }>(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'finance_transactions'`,
    { type: QueryTypes.SELECT },
  );
  if (tableRows.length === 0) {
    return;
  }
  await sequelize.query(
    `ALTER TABLE \`finance_transactions\`
     ADD COLUMN \`booking_id\` VARCHAR(64) NULL,
     ADD CONSTRAINT \`finance_transactions_booking_id_fk\`
     FOREIGN KEY (\`booking_id\`) REFERENCES \`bookings\` (\`id\`)
     ON UPDATE CASCADE ON DELETE RESTRICT`,
  );
}

/** Adds `bookings.paid_at` / `bookings.hold_expires_at` when tables predate Sequelize fields. */
async function ensureBookingsPaymentColumns(): Promise<void> {
  if (sequelize.getDialect() !== 'mysql') {
    return;
  }
  const tableRows = await sequelize.query<{ TABLE_NAME: string }>(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings'`,
    { type: QueryTypes.SELECT },
  );
  if (tableRows.length === 0) {
    return;
  }
  const cols = await sequelize.query<{ COLUMN_NAME: string }>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings'
       AND COLUMN_NAME IN ('paid_at', 'hold_expires_at')`,
    { type: QueryTypes.SELECT },
  );
  const have = new Set(cols.map((c) => c.COLUMN_NAME));
  if (!have.has('paid_at')) {
    await sequelize.query('ALTER TABLE `bookings` ADD COLUMN `paid_at` DATETIME NULL');
  }
  if (!have.has('hold_expires_at')) {
    await sequelize.query('ALTER TABLE `bookings` ADD COLUMN `hold_expires_at` DATETIME NULL');
  }
}

async function ensureAuthTables(): Promise<void> {
  if (sequelize.getDialect() !== 'mysql') {
    return;
  }
  const rt = await sequelize.query<{ TABLE_NAME: string }>(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'refresh_tokens'`,
    { type: QueryTypes.SELECT },
  );
  if (rt.length === 0) {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS \`refresh_tokens\` (
        \`id\` VARCHAR(64) NOT NULL,
        \`user_id\` VARCHAR(64) NOT NULL,
        \`token_hash\` VARCHAR(128) NOT NULL,
        \`expires_at\` DATETIME NOT NULL,
        \`revoked_at\` DATETIME NULL,
        \`created_at\` DATETIME NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`refresh_tokens_token_hash\` (\`token_hash\`),
        KEY \`refresh_tokens_user_id\` (\`user_id\`),
        CONSTRAINT \`refresh_tokens_user_fk\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`)
          ON UPDATE CASCADE ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }
  const oa = await sequelize.query<{ TABLE_NAME: string }>(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'oauth_accounts'`,
    { type: QueryTypes.SELECT },
  );
  if (oa.length === 0) {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS \`oauth_accounts\` (
        \`id\` VARCHAR(64) NOT NULL,
        \`user_id\` VARCHAR(64) NOT NULL,
        \`provider\` ENUM('google','facebook','apple') NOT NULL,
        \`provider_user_id\` VARCHAR(255) NOT NULL,
        \`created_at\` DATETIME NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`oauth_provider_account\` (\`provider\`, \`provider_user_id\`),
        KEY \`oauth_accounts_user_id\` (\`user_id\`),
        CONSTRAINT \`oauth_accounts_user_fk\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`)
          ON UPDATE CASCADE ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }
}

export async function syncModels(): Promise<void> {
  await sequelize.sync({ alter: config.MYSQL.SYNC_ALTER });
  await ensureUsersIsActiveColumn();
  await ensureFinanceTransactionsBookingIdColumn();
  await ensureBookingsPaymentColumns();
  await ensureAuthTables();
}
