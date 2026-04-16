import { QueryTypes } from 'sequelize';
import config from '../config';
import { sequelize } from '../database/sequelize';
import { Blog } from './blog.model';
import { BookedCall } from './booked-call.model';
import { Booking } from './booking.model';
import { BookingSlot } from './booking-slot.model';
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
import { InstructorStudentRating } from './instructor-student-rating.model';
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

Booking.hasMany(BookingSlot, { foreignKey: 'bookingId', sourceKey: 'id', as: 'slotClaims' });
BookingSlot.belongsTo(Booking, { foreignKey: 'bookingId', targetKey: 'id', as: 'booking' });

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

InstructorStudentRating.belongsTo(User, { foreignKey: 'studentUserId', targetKey: 'id', as: 'ratingStudent' });
InstructorStudentRating.belongsTo(User, { foreignKey: 'instructorUserId', targetKey: 'id', as: 'ratedInstructor' });
User.hasMany(InstructorStudentRating, { foreignKey: 'studentUserId', sourceKey: 'id', as: 'instructorRatingsGiven' });
User.hasMany(InstructorStudentRating, { foreignKey: 'instructorUserId', sourceKey: 'id', as: 'instructorRatingsReceived' });

FinanceTransaction.belongsTo(Branch, { foreignKey: 'branchId', targetKey: 'id' });

export {
  Blog,
  BookedCall,
  Booking,
  BookingSlot,
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
  InstructorStudentRating,
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

/** Adds `packages.image_url` when the table predates the Sequelize model field (sync without alter skips new columns). */
async function ensurePackagesImageUrlColumn(): Promise<void> {
  if (sequelize.getDialect() !== 'mysql') {
    return;
  }
  const tableRows = await sequelize.query<{ TABLE_NAME: string }>(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'packages'`,
    { type: QueryTypes.SELECT },
  );
  if (tableRows.length === 0) {
    return;
  }
  const colRows = await sequelize.query<{ COLUMN_NAME: string }>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'packages' AND COLUMN_NAME = 'image_url'`,
    { type: QueryTypes.SELECT },
  );
  if (colRows.length > 0) {
    return;
  }
  await sequelize.query('ALTER TABLE `packages` ADD COLUMN `image_url` TEXT NULL');
}

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
     ADD COLUMN \`booking_id\` INT UNSIGNED NULL,
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

/** Adds multi-hour booking columns when tables predate Sequelize fields. */
async function ensureBookingsMultiSlotColumns(): Promise<void> {
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
       AND COLUMN_NAME IN ('end_time', 'total_price_amd')`,
    { type: QueryTypes.SELECT },
  );
  const have = new Set(cols.map((c) => c.COLUMN_NAME));
  if (!have.has('end_time')) {
    await sequelize.query('ALTER TABLE `bookings` ADD COLUMN `end_time` VARCHAR(16) NULL');
  }
  if (!have.has('total_price_amd')) {
    await sequelize.query('ALTER TABLE `bookings` ADD COLUMN `total_price_amd` INT UNSIGNED NULL');
  }
}

/**
 * Hour-level slot claims + unique (instructor, date, slot) for race-safe booking.
 * Safe to call repeatedly; creates table and backfills legacy single-slot rows.
 */
async function ensureBookingSlotsTable(): Promise<void> {
  if (sequelize.getDialect() !== 'mysql') {
    return;
  }
  const bookingTable = await sequelize.query<{ TABLE_NAME: string }>(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings'`,
    { type: QueryTypes.SELECT },
  );
  if (bookingTable.length === 0) {
    return;
  }
  const slotTable = await sequelize.query<{ TABLE_NAME: string }>(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'booking_slots'`,
    { type: QueryTypes.SELECT },
  );
  if (slotTable.length === 0) {
    await sequelize.query(`
      CREATE TABLE \`booking_slots\` (
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`booking_id\` INT UNSIGNED NOT NULL,
        \`instructor_user_id\` INT UNSIGNED NOT NULL,
        \`date_iso\` DATE NOT NULL,
        \`slot_time\` VARCHAR(16) NOT NULL,
        \`created_at\` DATETIME NOT NULL,
        \`updated_at\` DATETIME NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`booking_slots_inst_date_slot_uniq\` (\`instructor_user_id\`, \`date_iso\`, \`slot_time\`),
        KEY \`booking_slots_booking_id_idx\` (\`booking_id\`),
        CONSTRAINT \`booking_slots_booking_fk\` FOREIGN KEY (\`booking_id\`) REFERENCES \`bookings\` (\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }
  await sequelize.query(`
    INSERT IGNORE INTO \`booking_slots\`
      (\`booking_id\`, \`instructor_user_id\`, \`date_iso\`, \`slot_time\`, \`created_at\`, \`updated_at\`)
    SELECT \`id\`, \`instructor_user_id\`, \`date_iso\`, \`time\`, NOW(), NOW()
    FROM \`bookings\` b
    WHERE NOT EXISTS (SELECT 1 FROM \`booking_slots\` s WHERE s.\`booking_id\` = b.\`id\`)
  `);
}

/**
 * Legacy `marketing_settings` used `setting_key` as the primary key. Sequelize now expects a
 * surrogate `id` (sync with `alter: false` does not add it), which breaks `findAll` / `upsert`.
 */
async function ensureMarketingSettingsIdColumn(): Promise<void> {
  if (sequelize.getDialect() !== 'mysql') {
    return;
  }
  const tableRows = await sequelize.query<{ TABLE_NAME: string }>(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'marketing_settings'`,
    { type: QueryTypes.SELECT },
  );
  if (tableRows.length === 0) {
    return;
  }
  const idRows = await sequelize.query<{ COLUMN_NAME: string }>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'marketing_settings' AND COLUMN_NAME = 'id'`,
    { type: QueryTypes.SELECT },
  );
  if (idRows.length > 0) {
    return;
  }
  const pkCols = await sequelize.query<{ COLUMN_NAME: string; ORDINAL_POSITION: number }>(
    `SELECT COLUMN_NAME, ORDINAL_POSITION FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'marketing_settings' AND CONSTRAINT_NAME = 'PRIMARY'
     ORDER BY ORDINAL_POSITION`,
    { type: QueryTypes.SELECT },
  );
  if (pkCols.length === 1 && pkCols[0].COLUMN_NAME === 'setting_key') {
    await sequelize.query(
      `ALTER TABLE \`marketing_settings\`
       DROP PRIMARY KEY,
       ADD COLUMN \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT FIRST,
       ADD PRIMARY KEY (\`id\`),
       ADD UNIQUE KEY \`marketing_settings_setting_key\` (\`setting_key\`)`,
    );
    return;
  }
  if (pkCols.length === 0) {
    await sequelize.query(
      `ALTER TABLE \`marketing_settings\`
       ADD COLUMN \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT FIRST,
       ADD PRIMARY KEY (\`id\`)`,
    );
    const uniq = await sequelize.query<{ COLUMN_NAME: string }>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'marketing_settings'
         AND COLUMN_NAME = 'setting_key' AND NON_UNIQUE = 0`,
      { type: QueryTypes.SELECT },
    );
    if (uniq.length === 0) {
      await sequelize.query(
        'ALTER TABLE `marketing_settings` ADD UNIQUE KEY `marketing_settings_setting_key` (`setting_key`)',
      );
    }
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
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`user_id\` INT UNSIGNED NOT NULL,
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
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`user_id\` INT UNSIGNED NOT NULL,
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

function isMysqlIntegerDataType(dataType: string): boolean {
  const t = dataType.toLowerCase();
  return t === 'int' || t === 'bigint' || t === 'mediumint' || t === 'smallint' || t === 'tinyint';
}

/**
 * Normalize `refresh_tokens.id` to `INT UNSIGNED AUTO_INCREMENT`.
 * Legacy drafts sometimes used `VARCHAR` `id` for opaque tokens (e.g. `RT-…`); Sequelize expects a numeric surrogate PK.
 */
async function ensureRefreshTokensIdColumn(): Promise<void> {
  if (sequelize.getDialect() !== 'mysql') {
    return;
  }
  const tables = await sequelize.query<{ TABLE_NAME: string }>(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'refresh_tokens'`,
    { type: QueryTypes.SELECT },
  );
  if (tables.length === 0) {
    return;
  }
  const rows = await sequelize.query<{ DATA_TYPE: string; EXTRA: string | null }>(
    `SELECT DATA_TYPE, EXTRA FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'refresh_tokens' AND COLUMN_NAME = 'id'`,
    { type: QueryTypes.SELECT },
  );
  if (rows.length === 0) {
    return;
  }
  const { DATA_TYPE: dataType, EXTRA: extra } = rows[0];
  if (!isMysqlIntegerDataType(String(dataType))) {
    await sequelize.query('DELETE FROM `refresh_tokens`');
    await sequelize.query(
      'ALTER TABLE `refresh_tokens` MODIFY COLUMN `id` INT UNSIGNED NOT NULL AUTO_INCREMENT',
    );
    return;
  }
  if (String(extra ?? '').toLowerCase().includes('auto_increment')) {
    return;
  }
  await sequelize.query(
    'ALTER TABLE `refresh_tokens` MODIFY COLUMN `id` INT UNSIGNED NOT NULL AUTO_INCREMENT',
  );
}

/** Same integer + AUTO_INCREMENT guarantees as {@link ensureRefreshTokensIdColumn} for OAuth rows. */
async function ensureOAuthAccountsIdColumn(): Promise<void> {
  if (sequelize.getDialect() !== 'mysql') {
    return;
  }
  const tables = await sequelize.query<{ TABLE_NAME: string }>(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'oauth_accounts'`,
    { type: QueryTypes.SELECT },
  );
  if (tables.length === 0) {
    return;
  }
  const rows = await sequelize.query<{ DATA_TYPE: string; EXTRA: string | null }>(
    `SELECT DATA_TYPE, EXTRA FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'oauth_accounts' AND COLUMN_NAME = 'id'`,
    { type: QueryTypes.SELECT },
  );
  if (rows.length === 0) {
    return;
  }
  const { DATA_TYPE: dataType, EXTRA: extra } = rows[0];
  if (!isMysqlIntegerDataType(String(dataType))) {
    await sequelize.query('DELETE FROM `oauth_accounts`');
    await sequelize.query(
      'ALTER TABLE `oauth_accounts` MODIFY COLUMN `id` INT UNSIGNED NOT NULL AUTO_INCREMENT',
    );
    return;
  }
  if (String(extra ?? '').toLowerCase().includes('auto_increment')) {
    return;
  }
  await sequelize.query(
    'ALTER TABLE `oauth_accounts` MODIFY COLUMN `id` INT UNSIGNED NOT NULL AUTO_INCREMENT',
  );
}

/**
 * This codebase expects unsigned integer surrogate keys on core tables (`users.id`, `bookings.id`, …).
 * Old volumes used `VARCHAR(64)` opaque ids; Sequelize then creates `booking_slots.booking_id` as
 * `INT UNSIGNED`, which MySQL rejects as an FK to `varchar` (`booking_slots_ibfk_1` incompatibility).
 */
async function assertMysqlCoreIdsAreInteger(): Promise<void> {
  if (sequelize.getDialect() !== 'mysql') {
    return;
  }
  const rows = await sequelize.query<{ DATA_TYPE: string }>(
    `SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'id'`,
    { type: QueryTypes.SELECT },
  );
  if (rows.length === 0) {
    return;
  }
  const dataType = String(rows[0].DATA_TYPE).toLowerCase();
  if (dataType === 'int') {
    return;
  }
  throw new Error(
    'Database schema mismatch: `users.id` is not an INTEGER column (found ' +
      `${JSON.stringify(dataType)}). This API version expects unsigned integer surrogate primary keys ` +
      'on core tables. For local Docker, reset the data volume: `docker compose down -v` then `docker compose up`. ' +
      'For production, migrate legacy varchar PKs to integers before deploying.',
  );
}

export async function syncModels(): Promise<void> {
  await assertMysqlCoreIdsAreInteger();
  /** Run before `sync()` so alter/migrate does not hit legacy varchar token ids on `refresh_tokens.id`. */
  await ensureRefreshTokensIdColumn();
  await ensureOAuthAccountsIdColumn();
  await sequelize.sync({ alter: config.MYSQL.SYNC_ALTER });
  await ensurePackagesImageUrlColumn();
  await ensureUsersIsActiveColumn();
  await ensureFinanceTransactionsBookingIdColumn();
  await ensureBookingsPaymentColumns();
  await ensureBookingsMultiSlotColumns();
  await ensureBookingSlotsTable();
  await ensureMarketingSettingsIdColumn();
  await ensureAuthTables();
}
