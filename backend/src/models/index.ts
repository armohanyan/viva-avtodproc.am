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
import { InstructorScheduleRule } from './instructor-schedule-rule.model';
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
import { StudentInvitation } from './student-invitation.model';
import { StudentExamStats } from './student-exam-stats.model';
import { AdminMfaChallenge } from './admin-mfa-challenge.model';

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

User.hasMany(InstructorScheduleRule, { foreignKey: 'instructorUserId', sourceKey: 'id' });
InstructorScheduleRule.belongsTo(User, { foreignKey: 'instructorUserId', targetKey: 'id' });

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

User.hasMany(StudentInvitation, { foreignKey: 'userId', sourceKey: 'id' });
StudentInvitation.belongsTo(User, { foreignKey: 'userId', targetKey: 'id' });

User.hasOne(StudentExamStats, { foreignKey: 'userId', sourceKey: 'id', as: 'examStats' });
StudentExamStats.belongsTo(User, { foreignKey: 'userId', targetKey: 'id', as: 'studentUser' });

User.hasMany(AdminMfaChallenge, { foreignKey: 'userId', sourceKey: 'id' });
AdminMfaChallenge.belongsTo(User, { foreignKey: 'userId', targetKey: 'id' });

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
  InstructorScheduleRule,
  InstructorBranch,
  InstructorProfile,
  InstructorStudentRating,
  MarketingSetting,
  MarketingStat,
  MarketingTestimonial,
  AdminMfaChallenge,
  OAuthAccount,
  Package,
  RefreshToken,
  StudentInvitation,
  StudentExamStats,
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

/** Adds `packages.theory_lessons` when the table predates the field (sync without alter skips new columns). */
async function ensurePackagesTheoryLessonsColumn(): Promise<void> {
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
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'packages' AND COLUMN_NAME = 'theory_lessons'`,
    { type: QueryTypes.SELECT },
  );
  if (colRows.length > 0) {
    return;
  }
  await sequelize.query(
    'ALTER TABLE `packages` ADD COLUMN `theory_lessons` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `lessons`',
  );
}

/** Adds theory progress columns on `student_profiles` when missing. */
async function ensureStudentProfilesTheoryLessonColumns(): Promise<void> {
  if (sequelize.getDialect() !== 'mysql') {
    return;
  }
  const tableRows = await sequelize.query<{ TABLE_NAME: string }>(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'student_profiles'`,
    { type: QueryTypes.SELECT },
  );
  if (tableRows.length === 0) {
    return;
  }
  const cols = await sequelize.query<{ COLUMN_NAME: string }>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'student_profiles'
       AND COLUMN_NAME IN ('theory_lessons_total', 'theory_lessons_completed')`,
    { type: QueryTypes.SELECT },
  );
  const have = new Set(cols.map((c) => c.COLUMN_NAME));
  if (!have.has('theory_lessons_total')) {
    await sequelize.query(
      'ALTER TABLE `student_profiles` ADD COLUMN `theory_lessons_total` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `lessons_total`',
    );
  }
  if (!have.has('theory_lessons_completed')) {
    await sequelize.query(
      'ALTER TABLE `student_profiles` ADD COLUMN `theory_lessons_completed` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `theory_lessons_total`',
    );
  }
}

/** Adds password reset columns on `users` when the table predates the Sequelize model fields. */
async function ensureUsersPasswordResetColumns(): Promise<void> {
  if (sequelize.getDialect() !== 'mysql') {
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
  const cols = await sequelize.query<{ COLUMN_NAME: string }>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
       AND COLUMN_NAME IN ('password_reset_token_hash', 'password_reset_expires_at')`,
    { type: QueryTypes.SELECT },
  );
  const have = new Set(cols.map((c) => c.COLUMN_NAME));
  if (!have.has('password_reset_token_hash')) {
    await sequelize.query(
      'ALTER TABLE `users` ADD COLUMN `password_reset_token_hash` VARCHAR(128) NULL',
    );
  }
  if (!have.has('password_reset_expires_at')) {
    await sequelize.query('ALTER TABLE `users` ADD COLUMN `password_reset_expires_at` DATETIME NULL');
  }
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

/** Drops legacy `car_expenses.channel` / `car_expenses.method` (fleet expenses no longer classify payments). */
async function ensureCarExpensesDropPaymentColumns(): Promise<void> {
  if (sequelize.getDialect() !== 'mysql') {
    return;
  }
  const tableRows = await sequelize.query<{ TABLE_NAME: string }>(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'car_expenses'`,
    { type: QueryTypes.SELECT },
  );
  if (tableRows.length === 0) {
    return;
  }
  const cols = await sequelize.query<{ COLUMN_NAME: string }>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'car_expenses'
       AND COLUMN_NAME IN ('channel', 'method')`,
    { type: QueryTypes.SELECT },
  );
  const have = new Set(cols.map((c) => c.COLUMN_NAME));
  if (have.has('channel')) {
    await sequelize.query('ALTER TABLE `car_expenses` DROP COLUMN `channel`');
  }
  if (have.has('method')) {
    await sequelize.query('ALTER TABLE `car_expenses` DROP COLUMN `method`');
  }
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

/** Adds `bookings.hold_extension_count` when tables predate Sequelize fields. */
async function ensureBookingsHoldExtensionCountColumn(): Promise<void> {
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
       AND COLUMN_NAME IN ('hold_extension_count')`,
    { type: QueryTypes.SELECT },
  );
  const have = new Set(cols.map((c) => c.COLUMN_NAME));
  if (!have.has('hold_extension_count')) {
    await sequelize.query(
      'ALTER TABLE `bookings` ADD COLUMN `hold_extension_count` INT UNSIGNED NOT NULL DEFAULT 0',
    );
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

async function ensureStudentExamStatsTable(): Promise<void> {
  if (sequelize.getDialect() !== 'mysql') {
    return;
  }
  const t = await sequelize.query<{ TABLE_NAME: string }>(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'student_exam_stats'`,
    { type: QueryTypes.SELECT },
  );
  if (t.length > 0) {
    return;
  }
  const users = await sequelize.query<{ TABLE_NAME: string }>(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'`,
    { type: QueryTypes.SELECT },
  );
  if (users.length === 0) {
    return;
  }
  await sequelize.query(`
    CREATE TABLE \`student_exam_stats\` (
      \`user_id\` INT UNSIGNED NOT NULL,
      \`payload\` JSON NOT NULL,
      PRIMARY KEY (\`user_id\`),
      CONSTRAINT \`student_exam_stats_user_fk\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`)
        ON UPDATE CASCADE ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function ensureStudentInvitationsTable(): Promise<void> {
  if (sequelize.getDialect() !== 'mysql') {
    return;
  }
  const t = await sequelize.query<{ TABLE_NAME: string }>(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'student_invitations'`,
    { type: QueryTypes.SELECT },
  );
  if (t.length > 0) {
    return;
  }
  const users = await sequelize.query<{ TABLE_NAME: string }>(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'`,
    { type: QueryTypes.SELECT },
  );
  if (users.length === 0) {
    return;
  }
  await sequelize.query(`
    CREATE TABLE \`student_invitations\` (
      \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`user_id\` INT UNSIGNED NOT NULL,
      \`token_hash\` VARCHAR(128) NOT NULL,
      \`expires_at\` DATETIME NOT NULL,
      \`consumed_at\` DATETIME NULL,
      \`created_at\` DATETIME NOT NULL,
      \`updated_at\` DATETIME NOT NULL,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`student_invitations_token_hash\` (\`token_hash\`),
      KEY \`student_invitations_user_id\` (\`user_id\`),
      CONSTRAINT \`student_invitations_user_fk\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`)
        ON UPDATE CASCADE ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function ensureAdminMfaChallengesTable(): Promise<void> {
  if (sequelize.getDialect() !== 'mysql') {
    return;
  }
  const t = await sequelize.query<{ TABLE_NAME: string }>(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'admin_mfa_challenges'`,
    { type: QueryTypes.SELECT },
  );
  if (t.length > 0) {
    return;
  }
  const users = await sequelize.query<{ TABLE_NAME: string }>(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'`,
    { type: QueryTypes.SELECT },
  );
  if (users.length === 0) {
    return;
  }
  await sequelize.query(`
    CREATE TABLE \`admin_mfa_challenges\` (
      \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`user_id\` INT UNSIGNED NOT NULL,
      \`code_hash\` VARCHAR(128) NOT NULL,
      \`expires_at\` DATETIME NOT NULL,
      \`consumed_at\` DATETIME NULL,
      \`created_at\` DATETIME NOT NULL,
      \`updated_at\` DATETIME NOT NULL,
      PRIMARY KEY (\`id\`),
      KEY \`admin_mfa_challenges_user_id\` (\`user_id\`),
      CONSTRAINT \`admin_mfa_challenges_user_fk\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`)
        ON UPDATE CASCADE ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function ensureBookingsConfirmationEmailSentAtColumn(): Promise<void> {
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
  const colRows = await sequelize.query<{ COLUMN_NAME: string }>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'confirmation_email_sent_at'`,
    { type: QueryTypes.SELECT },
  );
  if (colRows.length > 0) {
    return;
  }
  await sequelize.query('ALTER TABLE `bookings` ADD COLUMN `confirmation_email_sent_at` DATETIME NULL');
}

async function ensureBookingsCancellationRequestedAtColumn(): Promise<void> {
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
  const colRows = await sequelize.query<{ COLUMN_NAME: string }>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'cancellation_requested_at'`,
    { type: QueryTypes.SELECT },
  );
  if (colRows.length > 0) {
    return;
  }
  await sequelize.query('ALTER TABLE `bookings` ADD COLUMN `cancellation_requested_at` DATETIME NULL');
}

async function bookingTableColumnNames(): Promise<Set<string>> {
  const rows = await sequelize.query<{ COLUMN_NAME: string }>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings'`,
    { type: QueryTypes.SELECT },
  );
  return new Set(rows.map((r) => r.COLUMN_NAME));
}

/**
 * Single nullable flag: lesson passed / did not pass / not set.
 * Migrates legacy `instructor_lesson_confirmed` + `admin_lesson_passed_successfully` when present.
 */
async function ensureBookingsLessonPassedSuccessfullyColumn(): Promise<void> {
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

  let cols = await bookingTableColumnNames();

  if (!cols.has('lesson_passed_successfully')) {
    await sequelize.query(
      'ALTER TABLE `bookings` ADD COLUMN `lesson_passed_successfully` TINYINT(1) NULL',
    );
    cols = await bookingTableColumnNames();
  }

  const hasInst = cols.has('instructor_lesson_confirmed');
  const hasAdmin = cols.has('admin_lesson_passed_successfully');

  if (hasInst && hasAdmin) {
    await sequelize.query(`
      UPDATE \`bookings\`
      SET \`lesson_passed_successfully\` = CASE
        WHEN \`admin_lesson_passed_successfully\` = 0 THEN 0
        WHEN \`admin_lesson_passed_successfully\` = 1 OR \`instructor_lesson_confirmed\` = 1 THEN 1
        ELSE NULL
      END
      WHERE \`lesson_passed_successfully\` IS NULL
    `);
  } else if (hasInst) {
    await sequelize.query(`
      UPDATE \`bookings\`
      SET \`lesson_passed_successfully\` = CASE
        WHEN \`instructor_lesson_confirmed\` = 1 THEN 1
        ELSE NULL
      END
      WHERE \`lesson_passed_successfully\` IS NULL
    `);
  } else if (hasAdmin) {
    await sequelize.query(`
      UPDATE \`bookings\`
      SET \`lesson_passed_successfully\` = \`admin_lesson_passed_successfully\`
      WHERE \`lesson_passed_successfully\` IS NULL
    `);
  }

  if (hasInst) {
    await sequelize.query('ALTER TABLE `bookings` DROP COLUMN `instructor_lesson_confirmed`');
  }
  if (hasAdmin) {
    await sequelize.query('ALTER TABLE `bookings` DROP COLUMN `admin_lesson_passed_successfully`');
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

/**
 * Replaces legacy `instructor_availability_blocks` with `instructor_schedule_rules` (clearer `rule_kind` values).
 * Safe to run repeatedly: copies rows only when the new table is empty and the legacy table still exists.
 */
async function migrateLegacyInstructorAvailabilityBlocksTable(): Promise<void> {
  if (sequelize.getDialect() !== 'mysql') {
    return;
  }
  const legacy = await sequelize.query<{ TABLE_NAME: string }>(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'instructor_availability_blocks'`,
    { type: QueryTypes.SELECT },
  );
  if (legacy.length === 0) {
    return;
  }
  const modern = await sequelize.query<{ TABLE_NAME: string }>(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'instructor_schedule_rules'`,
    { type: QueryTypes.SELECT },
  );
  if (modern.length === 0) {
    return;
  }
  const [{ c: newCount }] = await sequelize.query<{ c: string }>(
    'SELECT COUNT(*) AS c FROM `instructor_schedule_rules`',
    { type: QueryTypes.SELECT },
  );
  const [{ c: oldCount }] = await sequelize.query<{ c: string }>(
    'SELECT COUNT(*) AS c FROM `instructor_availability_blocks`',
    { type: QueryTypes.SELECT },
  );
  const nNew = Number(newCount);
  const nOld = Number(oldCount);
  if (nNew === 0 && nOld > 0) {
    await sequelize.query(`
      INSERT INTO \`instructor_schedule_rules\`
        (\`id\`, \`instructor_user_id\`, \`rule_kind\`, \`weekday\`, \`date_iso\`, \`time_start\`, \`time_end\`, \`all_day\`, \`created_at\`, \`updated_at\`)
      SELECT
        \`id\`,
        \`instructor_user_id\`,
        CASE TRIM(CAST(\`rule_kind\` AS CHAR))
          WHEN 'weekly_work' THEN 'work_hours'
          WHEN 'weekly_break' THEN 'recurring_busy'
          WHEN 'weekday_lunch' THEN 'lunch'
          WHEN 'date_off' THEN 'day_off'
          WHEN 'date_break' THEN 'date_busy'
          ELSE 'lunch'
        END,
        \`weekday\`,
        \`date_iso\`,
        \`time_start\`,
        \`time_end\`,
        \`all_day\`,
        \`created_at\`,
        \`updated_at\`
      FROM \`instructor_availability_blocks\`
    `);
    const [{ mx }] = await sequelize.query<{ mx: number | null }>(
      'SELECT MAX(`id`) AS mx FROM `instructor_schedule_rules`',
      { type: QueryTypes.SELECT },
    );
    if (mx != null && Number.isFinite(Number(mx))) {
      const next = Number(mx) + 1;
      await sequelize.query(
        `ALTER TABLE \`instructor_schedule_rules\` AUTO_INCREMENT = ${next}`,
      );
    }
  }
  await sequelize.query('DROP TABLE IF EXISTS `instructor_availability_blocks`');
}

/** Drops legacy `instructor_profiles.schedule` (free-text); availability uses `instructor_schedule_rules`. */
async function ensureInstructorProfilesDropScheduleColumn(): Promise<void> {
  if (sequelize.getDialect() !== 'mysql') {
    return;
  }
  const tableRows = await sequelize.query<{ TABLE_NAME: string }>(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'instructor_profiles'`,
    { type: QueryTypes.SELECT },
  );
  if (tableRows.length === 0) {
    return;
  }
  const colRows = await sequelize.query<{ COLUMN_NAME: string }>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'instructor_profiles' AND COLUMN_NAME = 'schedule'`,
    { type: QueryTypes.SELECT },
  );
  if (colRows.length === 0) {
    return;
  }
  await sequelize.query('ALTER TABLE `instructor_profiles` DROP COLUMN `schedule`');
}

/** Drops legacy `theory_cohorts.schedule` (free-text); period is `start_date_iso` / `end_date_iso`. */
async function ensureTheoryCohortsDropScheduleColumn(): Promise<void> {
  if (sequelize.getDialect() !== 'mysql') {
    return;
  }
  const tableRows = await sequelize.query<{ TABLE_NAME: string }>(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'theory_cohorts'`,
    { type: QueryTypes.SELECT },
  );
  if (tableRows.length === 0) {
    return;
  }
  const colRows = await sequelize.query<{ COLUMN_NAME: string }>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'theory_cohorts' AND COLUMN_NAME = 'schedule'`,
    { type: QueryTypes.SELECT },
  );
  if (colRows.length === 0) {
    return;
  }
  await sequelize.query('ALTER TABLE `theory_cohorts` DROP COLUMN `schedule`');
}

/**
 * Allows removing catalog `packages` rows while keeping student profiles: nulls `package_id` and
 * replaces restrictive FKs (e.g. `ON DELETE RESTRICT`) with `ON DELETE SET NULL`.
 */
async function ensureStudentProfilesPackageIdOnDeleteSetNull(): Promise<void> {
  if (sequelize.getDialect() !== 'mysql') {
    return;
  }
  const tableRows = await sequelize.query<{ TABLE_NAME: string }>(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'student_profiles'`,
    { type: QueryTypes.SELECT },
  );
  if (tableRows.length === 0) {
    return;
  }
  const colRows = await sequelize.query<{ IS_NULLABLE: 'YES' | 'NO' }>(
    `SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'student_profiles' AND COLUMN_NAME = 'package_id'`,
    { type: QueryTypes.SELECT },
  );
  if (colRows.length === 0) {
    return;
  }
  const nullable = colRows[0]!.IS_NULLABLE === 'YES';
  const fkRows = await sequelize.query<{ CONSTRAINT_NAME: string; DELETE_RULE: string }>(
    `SELECT rc.CONSTRAINT_NAME, rc.DELETE_RULE
     FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
     INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
       ON rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
       AND rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
       AND rc.TABLE_NAME = kcu.TABLE_NAME
     WHERE rc.CONSTRAINT_SCHEMA = DATABASE()
       AND rc.TABLE_NAME = 'student_profiles'
       AND kcu.COLUMN_NAME = 'package_id'
       AND kcu.REFERENCED_TABLE_NAME = 'packages'`,
    { type: QueryTypes.SELECT },
  );
  if (nullable && fkRows.length === 1 && fkRows[0]!.DELETE_RULE === 'SET NULL') {
    return;
  }
  for (const row of fkRows) {
    const name = row.CONSTRAINT_NAME.replace(/`/g, '');
    await sequelize.query(`ALTER TABLE \`student_profiles\` DROP FOREIGN KEY \`${name}\``);
  }
  if (!nullable) {
    await sequelize.query(
      'ALTER TABLE `student_profiles` MODIFY COLUMN `package_id` INT UNSIGNED NULL',
    );
  }
  const remaining = await sequelize.query<{ CONSTRAINT_NAME: string; DELETE_RULE: string }>(
    `SELECT rc.CONSTRAINT_NAME, rc.DELETE_RULE
     FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
     INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
       ON rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
       AND rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
       AND rc.TABLE_NAME = kcu.TABLE_NAME
     WHERE rc.CONSTRAINT_SCHEMA = DATABASE()
       AND rc.TABLE_NAME = 'student_profiles'
       AND kcu.COLUMN_NAME = 'package_id'
       AND kcu.REFERENCED_TABLE_NAME = 'packages'`,
    { type: QueryTypes.SELECT },
  );
  if (remaining.some((r) => r.DELETE_RULE === 'SET NULL')) {
    return;
  }
  for (const row of remaining) {
    const name = row.CONSTRAINT_NAME.replace(/`/g, '');
    await sequelize.query(`ALTER TABLE \`student_profiles\` DROP FOREIGN KEY \`${name}\``);
  }
  await sequelize.query(
    'ALTER TABLE `student_profiles` ADD CONSTRAINT `student_profiles_package_id_fk` ' +
      'FOREIGN KEY (`package_id`) REFERENCES `packages` (`id`) ON UPDATE CASCADE ON DELETE SET NULL',
  );
}

export async function syncModels(): Promise<void> {
  await assertMysqlCoreIdsAreInteger();
  /** Run before `sync()` so alter/migrate does not hit legacy varchar token ids on `refresh_tokens.id`. */
  await ensureRefreshTokensIdColumn();
  await ensureOAuthAccountsIdColumn();
  await sequelize.sync({ alter: config.MYSQL.SYNC_ALTER });
  await ensureInstructorProfilesDropScheduleColumn();
  await ensureTheoryCohortsDropScheduleColumn();
  await migrateLegacyInstructorAvailabilityBlocksTable();
  await ensurePackagesImageUrlColumn();
  await ensurePackagesTheoryLessonsColumn();
  await ensureStudentProfilesTheoryLessonColumns();
  await ensureUsersPasswordResetColumns();
  await ensureUsersIsActiveColumn();
  await ensureFinanceTransactionsBookingIdColumn();
  await ensureCarExpensesDropPaymentColumns();
  await ensureBookingsPaymentColumns();
  await ensureBookingsHoldExtensionCountColumn();
  await ensureBookingsMultiSlotColumns();
  await ensureBookingSlotsTable();
  await ensureMarketingSettingsIdColumn();
  await ensureAuthTables();
  await ensureStudentInvitationsTable();
  await ensureAdminMfaChallengesTable();
  await ensureBookingsConfirmationEmailSentAtColumn();
  await ensureBookingsCancellationRequestedAtColumn();
  await ensureBookingsLessonPassedSuccessfullyColumn();
  await ensureStudentProfilesPackageIdOnDeleteSetNull();
  await ensureStudentExamStatsTable();
}
