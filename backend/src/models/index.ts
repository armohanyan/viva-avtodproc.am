import { QueryTypes } from 'sequelize';
import config from '../config';
import { sequelize } from '../database/sequelize';
import { Blog } from './blog.model';
import { BookedCall } from './booked-call.model';
import { Booking } from './booking.model';
import { BookingSlot } from './booking-slot.model';
import { Branch } from './branch.model';
import { BranchPracticalSlotPlan } from './branch-practical-slot-plan.model';
import { BranchScheduleRule } from './branch-schedule-rule.model';
import { CarExpense } from './car-expense.model';
import { City } from './city.model';
import { ContactRequest } from './contact-request.model';
import { ExamQuestionBookmark } from './exam-question-bookmark.model';
import { ExamQuestionComment } from './exam-question-comment.model';
import { ExamQuestion } from './exam-question.model';
import { ExamQuestionMeta } from './exam-question-meta.model';
import { FinanceExpense } from './finance-expense.model';
import { FinanceTransaction } from './finance-transaction.model';
import { FleetCar } from './fleet-car.model';
import { FleetCarInstructor } from './fleet-car-instructor.model';
import { InstructorScheduleRule } from './instructor-schedule-rule.model';
import { InstructorBranch } from './instructor-branch.model';
import { InstructorPracticalSlotPlan } from './instructor-practical-slot-plan.model';
import { InstructorProfile } from './instructor-profile.model';
import { InstructorStudentRating } from './instructor-student-rating.model';
import { AppSetting } from './app-setting.model';
import { MarketingSetting } from './marketing-setting.model';
import { MarketingStat } from './marketing-stat.model';
import { MarketingTestimonial } from './marketing-testimonial.model';
import { Notification, NOTIFICATION_TYPES } from './notification.model';
import { Package } from './package.model';
import { PersonalTheoryLessonRequest } from './personal-theory-lesson-request.model';
import { PackageLessonBalance } from './package-lesson-balance.model';
import { PackageOrder } from './package-order.model';
import { PetrolConsumption } from './petrol-consumption.model';
import { PetrolExpense } from './petrol-expense.model';
import { StudentExtraPractical } from './student-extra-practical.model';
import { StudentProfile } from './student-profile.model';
import { TheoryCohort } from './theory-cohort.model';
import { TheoryCohortEnrollment } from './theory-cohort-enrollment.model';
import { TheoryCohortSession } from './theory-cohort-session.model';
import { TheoryCohortInstructor } from './theory-cohort-instructor.model';
import { User } from './user.model';
import { RefreshToken } from './refresh-token.model';
import { OAuthAccount } from './oauth-account.model';
import { StudentInvitation } from './student-invitation.model';
import { StudentExamStats } from './student-exam-stats.model';
import { AdminMfaChallenge } from './admin-mfa-challenge.model';

City.hasMany(Branch, { foreignKey: 'cityId', sourceKey: 'id' });
Branch.belongsTo(City, { foreignKey: 'cityId', targetKey: 'id' });
Branch.hasMany(BranchScheduleRule, { foreignKey: 'branchId', sourceKey: 'id' });
BranchScheduleRule.belongsTo(Branch, { foreignKey: 'branchId', targetKey: 'id' });
Branch.hasOne(BranchPracticalSlotPlan, { foreignKey: 'branchId', sourceKey: 'id', as: 'practicalSlotPlan' });
BranchPracticalSlotPlan.belongsTo(Branch, { foreignKey: 'branchId', targetKey: 'id' });

User.hasOne(InstructorProfile, { foreignKey: 'userId', sourceKey: 'id', as: 'instructorProfile' });
InstructorProfile.belongsTo(User, { foreignKey: 'userId', targetKey: 'id', as: 'user' });
User.hasOne(InstructorPracticalSlotPlan, { foreignKey: 'instructorUserId', sourceKey: 'id', as: 'practicalSlotPlan' });
InstructorPracticalSlotPlan.belongsTo(User, { foreignKey: 'instructorUserId', targetKey: 'id' });

User.hasOne(StudentProfile, { foreignKey: 'userId', sourceKey: 'id', as: 'studentProfile' });
StudentProfile.belongsTo(User, { foreignKey: 'userId', targetKey: 'id', as: 'studentAccount' });

StudentProfile.belongsTo(Branch, { foreignKey: 'branchId', targetKey: 'id' });
StudentProfile.belongsTo(Package, { foreignKey: 'packageId', targetKey: 'id', as: 'package' });
StudentProfile.belongsTo(User, { foreignKey: 'instructorUserId', targetKey: 'id', as: 'assignedInstructor' });

User.hasMany(PackageOrder, { foreignKey: 'studentUserId', sourceKey: 'id', as: 'packageOrders' });
PackageOrder.belongsTo(User, { foreignKey: 'studentUserId', targetKey: 'id', as: 'student' });
Package.hasMany(PackageOrder, { foreignKey: 'packageId', sourceKey: 'id', as: 'orders' });
PackageOrder.belongsTo(Package, { foreignKey: 'packageId', targetKey: 'id', as: 'package' });

PackageOrder.hasMany(PackageLessonBalance, { foreignKey: 'packageOrderId', sourceKey: 'id', as: 'lessonBalances' });
PackageLessonBalance.belongsTo(PackageOrder, { foreignKey: 'packageOrderId', targetKey: 'id', as: 'packageOrder' });
PackageLessonBalance.belongsTo(User, { foreignKey: 'studentUserId', targetKey: 'id', as: 'student' });
PackageLessonBalance.belongsTo(Package, { foreignKey: 'packageId', targetKey: 'id', as: 'package' });

User.hasMany(InstructorBranch, { foreignKey: 'instructorUserId', sourceKey: 'id' });
Branch.hasMany(InstructorBranch, { foreignKey: 'branchId', sourceKey: 'id' });
InstructorBranch.belongsTo(User, { foreignKey: 'instructorUserId', targetKey: 'id' });
InstructorBranch.belongsTo(Branch, { foreignKey: 'branchId', targetKey: 'id' });
User.belongsToMany(Branch, {
  through: InstructorBranch,
  foreignKey: 'instructorUserId',
  otherKey: 'branchId',
  as: 'branches',
});
Branch.belongsToMany(User, {
  through: InstructorBranch,
  foreignKey: 'branchId',
  otherKey: 'instructorUserId',
  as: 'instructors',
});

User.hasMany(InstructorScheduleRule, { foreignKey: 'instructorUserId', sourceKey: 'id' });
InstructorScheduleRule.belongsTo(User, { foreignKey: 'instructorUserId', targetKey: 'id' });

Booking.belongsTo(User, { foreignKey: 'studentUserId', targetKey: 'id', as: 'student' });
Booking.belongsTo(User, { foreignKey: 'instructorUserId', targetKey: 'id', as: 'instructor' });
Booking.belongsTo(Branch, { foreignKey: 'branchId', targetKey: 'id' });

PersonalTheoryLessonRequest.belongsTo(User, { foreignKey: 'studentUserId', targetKey: 'id', as: 'student' });
PersonalTheoryLessonRequest.belongsTo(User, { foreignKey: 'instructorUserId', targetKey: 'id', as: 'instructor' });
PersonalTheoryLessonRequest.belongsTo(User, { foreignKey: 'handledByAdminId', targetKey: 'id', as: 'handledByAdmin' });
PersonalTheoryLessonRequest.belongsTo(Branch, { foreignKey: 'branchId', targetKey: 'id' });
PersonalTheoryLessonRequest.belongsTo(Booking, { foreignKey: 'bookedLessonId', targetKey: 'id', as: 'bookedLesson' });

Booking.hasMany(BookingSlot, { foreignKey: 'bookingId', sourceKey: 'id', as: 'slotClaims' });
BookingSlot.belongsTo(Booking, { foreignKey: 'bookingId', targetKey: 'id', as: 'booking' });

Booking.hasMany(FinanceTransaction, { foreignKey: 'bookingId', sourceKey: 'id', as: 'financeTransactions' });
FinanceTransaction.belongsTo(Booking, { foreignKey: 'bookingId', targetKey: 'id', as: 'booking' });

FleetCar.hasMany(CarExpense, { foreignKey: 'carId', sourceKey: 'id' });
CarExpense.belongsTo(FleetCar, { foreignKey: 'carId', targetKey: 'id' });

FleetCar.hasMany(PetrolExpense, { foreignKey: 'carId', sourceKey: 'id' });
PetrolExpense.belongsTo(FleetCar, { foreignKey: 'carId', targetKey: 'id' });
User.hasMany(PetrolExpense, { foreignKey: 'instructorUserId', sourceKey: 'id', as: 'petrolExpensesAsInstructor' });
PetrolExpense.belongsTo(User, { foreignKey: 'instructorUserId', targetKey: 'id', as: 'instructor' });
User.hasMany(PetrolExpense, { foreignKey: 'createdByUserId', sourceKey: 'id', as: 'petrolExpensesCreated' });
PetrolExpense.belongsTo(User, { foreignKey: 'createdByUserId', targetKey: 'id', as: 'createdBy' });

FleetCar.hasMany(PetrolConsumption, { foreignKey: 'carId', sourceKey: 'id' });
PetrolConsumption.belongsTo(FleetCar, { foreignKey: 'carId', targetKey: 'id' });
User.hasMany(PetrolConsumption, {
  foreignKey: 'instructorUserId',
  sourceKey: 'id',
  as: 'petrolConsumptionsAsInstructor',
});
PetrolConsumption.belongsTo(User, { foreignKey: 'instructorUserId', targetKey: 'id', as: 'instructor' });
User.hasMany(PetrolConsumption, {
  foreignKey: 'createdByUserId',
  sourceKey: 'id',
  as: 'petrolConsumptionsCreated',
});
PetrolConsumption.belongsTo(User, { foreignKey: 'createdByUserId', targetKey: 'id', as: 'createdBy' });

FleetCar.hasMany(FleetCarInstructor, { foreignKey: 'carId', sourceKey: 'id' });
User.hasMany(FleetCarInstructor, { foreignKey: 'instructorUserId', sourceKey: 'id' });
FleetCarInstructor.belongsTo(FleetCar, { foreignKey: 'carId', targetKey: 'id' });
FleetCarInstructor.belongsTo(User, { foreignKey: 'instructorUserId', targetKey: 'id', as: 'user' });

TheoryCohort.hasMany(TheoryCohortEnrollment, { foreignKey: 'cohortId', sourceKey: 'id' });
TheoryCohortEnrollment.belongsTo(TheoryCohort, { foreignKey: 'cohortId', targetKey: 'id' });
TheoryCohortEnrollment.belongsTo(User, { foreignKey: 'studentUserId', targetKey: 'id', as: 'student' });
TheoryCohort.hasMany(TheoryCohortSession, { foreignKey: 'cohortId', sourceKey: 'id', as: 'sessions' });
TheoryCohortSession.belongsTo(TheoryCohort, { foreignKey: 'cohortId', targetKey: 'id', as: 'cohort' });
TheoryCohort.hasMany(TheoryCohortInstructor, { foreignKey: 'cohortId', sourceKey: 'id' });
TheoryCohortInstructor.belongsTo(TheoryCohort, { foreignKey: 'cohortId', targetKey: 'id' });
TheoryCohortInstructor.belongsTo(User, { foreignKey: 'instructorUserId', targetKey: 'id' });
User.hasMany(TheoryCohortInstructor, { foreignKey: 'instructorUserId', sourceKey: 'id' });

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
User.hasMany(ExamQuestionBookmark, { foreignKey: 'userId', sourceKey: 'id' });
ExamQuestionBookmark.belongsTo(User, { foreignKey: 'userId', targetKey: 'id', as: 'user' });
User.hasMany(ExamQuestionComment, { foreignKey: 'userId', sourceKey: 'id' });
ExamQuestionComment.belongsTo(User, { foreignKey: 'userId', targetKey: 'id', as: 'user' });

User.hasMany(AdminMfaChallenge, { foreignKey: 'userId', sourceKey: 'id' });
AdminMfaChallenge.belongsTo(User, { foreignKey: 'userId', targetKey: 'id' });
User.hasMany(Notification, { foreignKey: 'recipientUserId', sourceKey: 'id' });
Notification.belongsTo(User, { foreignKey: 'recipientUserId', targetKey: 'id', as: 'recipient' });

InstructorStudentRating.belongsTo(User, { foreignKey: 'studentUserId', targetKey: 'id', as: 'ratingStudent' });
InstructorStudentRating.belongsTo(User, { foreignKey: 'instructorUserId', targetKey: 'id', as: 'ratedInstructor' });
User.hasMany(InstructorStudentRating, { foreignKey: 'studentUserId', sourceKey: 'id', as: 'instructorRatingsGiven' });
User.hasMany(InstructorStudentRating, { foreignKey: 'instructorUserId', sourceKey: 'id', as: 'instructorRatingsReceived' });

FinanceTransaction.belongsTo(Branch, { foreignKey: 'branchId', targetKey: 'id' });

User.hasMany(FinanceExpense, { foreignKey: 'createdByUserId', sourceKey: 'id' });
FinanceExpense.belongsTo(User, { foreignKey: 'createdByUserId', targetKey: 'id', as: 'createdBy' });

export {
  AppSetting,
  Blog,
  BookedCall,
  Booking,
  BookingSlot,
  Branch,
  BranchPracticalSlotPlan,
  BranchScheduleRule,
  CarExpense,
  City,
  ContactRequest,
  ExamQuestionBookmark,
  ExamQuestionComment,
  ExamQuestion,
  ExamQuestionMeta,
  FinanceExpense,
  FinanceTransaction,
  FleetCar,
  FleetCarInstructor,
  InstructorScheduleRule,
  InstructorBranch,
  InstructorPracticalSlotPlan,
  InstructorProfile,
  InstructorStudentRating,
  MarketingSetting,
  MarketingStat,
  MarketingTestimonial,
  Notification,
  PackageLessonBalance,
  PackageOrder,
  PetrolConsumption,
  PetrolExpense,
  AdminMfaChallenge,
  OAuthAccount,
  Package,
  PersonalTheoryLessonRequest,
  RefreshToken,
  StudentInvitation,
  StudentExamStats,
  StudentExtraPractical,
  StudentProfile,
  TheoryCohort,
  TheoryCohortEnrollment,
  TheoryCohortInstructor,
  TheoryCohortSession,
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

async function ensurePackageOrdersTable(): Promise<void> {
  if (sequelize.getDialect() !== 'mysql') return;
  const t = await sequelize.query<{ TABLE_NAME: string }>(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'package_orders'`,
    { type: QueryTypes.SELECT },
  );
  if (t.length > 0) return;
  await sequelize.query(`
    CREATE TABLE \`package_orders\` (
      \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`student_user_id\` INT UNSIGNED NOT NULL,
      \`package_id\` INT UNSIGNED NOT NULL,
      \`status\` VARCHAR(32) NOT NULL DEFAULT 'active',
      \`paid_at\` DATETIME NULL,
      \`expires_at\` DATETIME NULL,
      \`source\` VARCHAR(32) NULL,
      \`note\` VARCHAR(255) NULL,
      \`finance_transaction_id\` INT UNSIGNED NULL,
      \`created_at\` DATETIME NOT NULL,
      \`updated_at\` DATETIME NOT NULL,
      PRIMARY KEY (\`id\`),
      KEY \`package_orders_student_idx\` (\`student_user_id\`),
      KEY \`package_orders_package_idx\` (\`package_id\`),
      CONSTRAINT \`package_orders_student_fk\` FOREIGN KEY (\`student_user_id\`) REFERENCES \`users\` (\`id\`)
        ON UPDATE CASCADE ON DELETE CASCADE,
      CONSTRAINT \`package_orders_package_fk\` FOREIGN KEY (\`package_id\`) REFERENCES \`packages\` (\`id\`)
        ON UPDATE CASCADE ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function ensurePackageLessonBalancesTable(): Promise<void> {
  if (sequelize.getDialect() !== 'mysql') return;
  const t = await sequelize.query<{ TABLE_NAME: string }>(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'package_lesson_balances'`,
    { type: QueryTypes.SELECT },
  );
  if (t.length > 0) return;
  await sequelize.query(`
    CREATE TABLE \`package_lesson_balances\` (
      \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`package_order_id\` INT UNSIGNED NOT NULL,
      \`student_user_id\` INT UNSIGNED NOT NULL,
      \`package_id\` INT UNSIGNED NOT NULL,
      \`lesson_type\` ENUM('practical','theory','theory_personal') NOT NULL,
      \`total_included\` INT UNSIGNED NOT NULL DEFAULT 0,
      \`booked_count\` INT UNSIGNED NOT NULL DEFAULT 0,
      \`created_at\` DATETIME NOT NULL,
      \`updated_at\` DATETIME NOT NULL,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`package_balances_order_type_uniq\` (\`package_order_id\`, \`lesson_type\`),
      KEY \`package_balances_student_idx\` (\`student_user_id\`),
      KEY \`package_balances_package_idx\` (\`package_id\`),
      CONSTRAINT \`package_balances_order_fk\` FOREIGN KEY (\`package_order_id\`) REFERENCES \`package_orders\` (\`id\`)
        ON UPDATE CASCADE ON DELETE CASCADE,
      CONSTRAINT \`package_balances_student_fk\` FOREIGN KEY (\`student_user_id\`) REFERENCES \`users\` (\`id\`)
        ON UPDATE CASCADE ON DELETE CASCADE,
      CONSTRAINT \`package_balances_package_fk\` FOREIGN KEY (\`package_id\`) REFERENCES \`packages\` (\`id\`)
        ON UPDATE CASCADE ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
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

/** Adds finance income/expense classification and rate-based expense metadata when missing. */
async function ensureFinanceTransactionsEntryColumns(): Promise<void> {
  if (sequelize.getDialect() !== 'mysql') {
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
  const cols = await sequelize.query<{ COLUMN_NAME: string }>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'finance_transactions'
       AND COLUMN_NAME IN ('entry_type', 'expense_kind', 'employee_name', 'units', 'unit_rate_amd')`,
    { type: QueryTypes.SELECT },
  );
  const have = new Set(cols.map((c) => c.COLUMN_NAME));
  if (!have.has('entry_type')) {
    await sequelize.query(
      "ALTER TABLE `finance_transactions` ADD COLUMN `entry_type` ENUM('income','expense') NOT NULL DEFAULT 'income' AFTER `source`",
    );
  }
  if (!have.has('expense_kind')) {
    await sequelize.query(
      "ALTER TABLE `finance_transactions` ADD COLUMN `expense_kind` ENUM('salary','hourly_rate','rent','utilities','maintenance','marketing','other') NULL AFTER `entry_type`",
    );
  }
  if (!have.has('employee_name')) {
    await sequelize.query(
      'ALTER TABLE `finance_transactions` ADD COLUMN `employee_name` VARCHAR(255) NULL AFTER `expense_kind`',
    );
  }
  if (!have.has('units')) {
    await sequelize.query(
      'ALTER TABLE `finance_transactions` ADD COLUMN `units` DECIMAL(10,2) NULL AFTER `employee_name`',
    );
  }
  if (!have.has('unit_rate_amd')) {
    await sequelize.query(
      'ALTER TABLE `finance_transactions` ADD COLUMN `unit_rate_amd` INT UNSIGNED NULL AFTER `units`',
    );
  }
}

/** Adds refund-request review timestamps on `finance_transactions` when missing. */
async function ensureFinanceTransactionsRefundColumns(): Promise<void> {
  if (sequelize.getDialect() !== 'mysql') {
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
  const cols = await sequelize.query<{ COLUMN_NAME: string }>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'finance_transactions'
       AND COLUMN_NAME IN ('refund_requested_at', 'refund_reviewed_at')`,
    { type: QueryTypes.SELECT },
  );
  const have = new Set(cols.map((c) => c.COLUMN_NAME));
  if (!have.has('refund_requested_at')) {
    await sequelize.query('ALTER TABLE `finance_transactions` ADD COLUMN `refund_requested_at` DATETIME NULL');
  }
  if (!have.has('refund_reviewed_at')) {
    await sequelize.query('ALTER TABLE `finance_transactions` ADD COLUMN `refund_reviewed_at` DATETIME NULL');
  }
}

/** Adds `booking_refund` expense kind and optional link to the original payment row. */
async function ensureFinanceTransactionsBookingRefundExpenseKind(): Promise<void> {
  if (sequelize.getDialect() !== 'mysql') {
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
  const kindRows = await sequelize.query<{ COLUMN_TYPE: string }>(
    `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'finance_transactions' AND COLUMN_NAME = 'expense_kind'`,
    { type: QueryTypes.SELECT },
  );
  const colType = kindRows[0]?.COLUMN_TYPE ?? '';
  if (colType && !colType.includes('booking_refund')) {
    await sequelize.query(
      "ALTER TABLE `finance_transactions` MODIFY COLUMN `expense_kind` ENUM(" +
        "'salary','hourly_rate','rent','utilities','maintenance','marketing','booking_refund','other'" +
        ') NULL DEFAULT NULL',
    );
  }
  const cols = await sequelize.query<{ COLUMN_NAME: string }>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'finance_transactions'
       AND COLUMN_NAME = 'related_payment_transaction_id'`,
    { type: QueryTypes.SELECT },
  );
  if (cols.length === 0) {
    await sequelize.query(
      'ALTER TABLE `finance_transactions` ADD COLUMN `related_payment_transaction_id` INT UNSIGNED NULL AFTER `booking_id`',
    );
  }
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

async function ensureCarExpensesTitleColumn(): Promise<void> {
  if (sequelize.getDialect() !== 'mysql') return;
  const tableRows = await sequelize.query<{ TABLE_NAME: string }>(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'car_expenses'`,
    { type: QueryTypes.SELECT },
  );
  if (tableRows.length === 0) return;
  const colRows = await sequelize.query<{ COLUMN_NAME: string }>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'car_expenses' AND COLUMN_NAME = 'title'`,
    { type: QueryTypes.SELECT },
  );
  if (colRows.length > 0) return;
  await sequelize.query('ALTER TABLE `car_expenses` ADD COLUMN `title` VARCHAR(255) NULL AFTER `car_id`');
}

async function ensurePetrolExpensesTable(): Promise<void> {
  if (sequelize.getDialect() !== 'mysql') return;
  const t = await sequelize.query<{ TABLE_NAME: string }>(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'petrol_expenses'`,
    { type: QueryTypes.SELECT },
  );
  if (t.length > 0) return;
  // eslint-disable-next-line no-console
  console.info('[migrate] Creating table petrol_expenses …');
  await sequelize.query(`
    CREATE TABLE \`petrol_expenses\` (
      \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`car_id\` INT UNSIGNED NOT NULL,
      \`instructor_user_id\` INT UNSIGNED NOT NULL,
      \`date\` DATE NOT NULL,
      \`petrol_type\` ENUM('benzin','lpg') NOT NULL DEFAULT 'benzin',
      \`petrol_count\` DECIMAL(10,2) NULL,
      \`price\` INT UNSIGNED NOT NULL,
      \`description\` TEXT NULL,
      \`created_by_user_id\` INT UNSIGNED NULL,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`petrol_expenses_date_idx\` (\`date\`),
      KEY \`petrol_expenses_instructor_date_idx\` (\`instructor_user_id\`, \`date\`),
      KEY \`petrol_expenses_car_idx\` (\`car_id\`),
      CONSTRAINT \`petrol_expenses_car_fk\` FOREIGN KEY (\`car_id\`) REFERENCES \`fleet_cars\` (\`id\`)
        ON UPDATE CASCADE ON DELETE RESTRICT,
      CONSTRAINT \`petrol_expenses_instructor_fk\` FOREIGN KEY (\`instructor_user_id\`) REFERENCES \`users\` (\`id\`)
        ON UPDATE CASCADE ON DELETE RESTRICT,
      CONSTRAINT \`petrol_expenses_created_by_fk\` FOREIGN KEY (\`created_by_user_id\`) REFERENCES \`users\` (\`id\`)
        ON UPDATE CASCADE ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function ensurePetrolExpensesTypeAndNullableCount(): Promise<void> {
  if (sequelize.getDialect() !== 'mysql') return;
  const tableRows = await sequelize.query<{ TABLE_NAME: string }>(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'petrol_expenses'`,
    { type: QueryTypes.SELECT },
  );
  if (tableRows.length === 0) return;

  const cols = await sequelize.query<{ COLUMN_NAME: string; IS_NULLABLE: string }>(
    `SELECT COLUMN_NAME, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'petrol_expenses'
       AND COLUMN_NAME IN ('petrol_type', 'petrol_count')`,
    { type: QueryTypes.SELECT },
  );
  const byName = new Map(cols.map((c) => [c.COLUMN_NAME, c]));

  if (!byName.has('petrol_type')) {
    await sequelize.query(`
      ALTER TABLE \`petrol_expenses\`
        ADD COLUMN \`petrol_type\` ENUM('benzin','lpg') NOT NULL DEFAULT 'benzin' AFTER \`date\`
    `);
  }

  const countCol = byName.get('petrol_count');
  if (countCol && countCol.IS_NULLABLE === 'NO') {
    await sequelize.query(`
      ALTER TABLE \`petrol_expenses\`
        MODIFY COLUMN \`petrol_count\` DECIMAL(10,2) NULL
    `);
  }
}

async function ensurePetrolConsumptionsTable(): Promise<void> {
  if (sequelize.getDialect() !== 'mysql') return;
  const t = await sequelize.query<{ TABLE_NAME: string }>(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'petrol_consumptions'`,
    { type: QueryTypes.SELECT },
  );
  if (t.length > 0) return;
  // eslint-disable-next-line no-console
  console.info('[migrate] Creating table petrol_consumptions …');
  await sequelize.query(`
    CREATE TABLE \`petrol_consumptions\` (
      \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`car_id\` INT UNSIGNED NOT NULL,
      \`instructor_user_id\` INT UNSIGNED NOT NULL,
      \`date\` DATE NOT NULL,
      \`distance_value\` DECIMAL(10,2) NOT NULL,
      \`distance_unit\` ENUM('km','mile') NOT NULL DEFAULT 'km',
      \`petrol_amount\` DECIMAL(10,2) NULL,
      \`petrol_unit\` ENUM('liter','ml') NOT NULL DEFAULT 'liter',
      \`description\` TEXT NULL,
      \`created_by_user_id\` INT UNSIGNED NULL,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`petrol_consumptions_date_idx\` (\`date\`),
      KEY \`petrol_consumptions_instructor_date_idx\` (\`instructor_user_id\`, \`date\`),
      KEY \`petrol_consumptions_car_idx\` (\`car_id\`),
      CONSTRAINT \`petrol_consumptions_car_fk\` FOREIGN KEY (\`car_id\`) REFERENCES \`fleet_cars\` (\`id\`)
        ON UPDATE CASCADE ON DELETE RESTRICT,
      CONSTRAINT \`petrol_consumptions_instructor_fk\` FOREIGN KEY (\`instructor_user_id\`) REFERENCES \`users\` (\`id\`)
        ON UPDATE CASCADE ON DELETE RESTRICT,
      CONSTRAINT \`petrol_consumptions_created_by_fk\` FOREIGN KEY (\`created_by_user_id\`) REFERENCES \`users\` (\`id\`)
        ON UPDATE CASCADE ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function ensurePetrolConsumptionsPetrolAmountNullable(): Promise<void> {
  if (sequelize.getDialect() !== 'mysql') return;
  const tableRows = await sequelize.query<{ TABLE_NAME: string }>(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'petrol_consumptions'`,
    { type: QueryTypes.SELECT },
  );
  if (tableRows.length === 0) return;

  const cols = await sequelize.query<{ IS_NULLABLE: string }>(
    `SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'petrol_consumptions'
       AND COLUMN_NAME = 'petrol_amount'`,
    { type: QueryTypes.SELECT },
  );
  if (cols[0]?.IS_NULLABLE === 'YES') return;

  await sequelize.query(`
    ALTER TABLE \`petrol_consumptions\`
      MODIFY COLUMN \`petrol_amount\` DECIMAL(10,2) NULL
  `);
}

async function ensureFinanceExpensesTable(): Promise<void> {
  if (sequelize.getDialect() !== 'mysql') return;
  const t = await sequelize.query<{ TABLE_NAME: string }>(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'finance_expenses'`,
    { type: QueryTypes.SELECT },
  );
  if (t.length > 0) return;
  await sequelize.query(`
    CREATE TABLE \`finance_expenses\` (
      \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`title\` VARCHAR(255) NOT NULL,
      \`amount\` INT UNSIGNED NOT NULL,
      \`date\` DATE NOT NULL,
      \`purpose\` ENUM('branch_rent','salary','other') NOT NULL,
      \`related_entity_type\` ENUM('branch','instructor') NULL,
      \`related_entity_id\` VARCHAR(64) NULL,
      \`expense_subtype\` VARCHAR(255) NULL,
      \`custom_purpose_text\` VARCHAR(512) NULL,
      \`notes\` TEXT NULL,
      \`created_by_user_id\` INT UNSIGNED NULL,
      \`created_at\` DATETIME NOT NULL,
      \`updated_at\` DATETIME NOT NULL,
      PRIMARY KEY (\`id\`),
      KEY \`finance_expenses_date_idx\` (\`date\`),
      CONSTRAINT \`finance_expenses_created_by_fk\` FOREIGN KEY (\`created_by_user_id\`) REFERENCES \`users\` (\`id\`)
        ON UPDATE CASCADE ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
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

/** Adds `bookings.payment_notes` and `bookings.payment_reminder_at` for admin debt reminders. */
async function ensureBookingsPaymentNotesAndReminderAtColumns(): Promise<void> {
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
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings'
       AND COLUMN_NAME IN ('payment_notes', 'payment_reminder_at')`,
    { type: QueryTypes.SELECT },
  );
  const have = new Set(colRows.map((c) => c.COLUMN_NAME));
  if (!have.has('payment_notes')) {
    await sequelize.query('ALTER TABLE `bookings` ADD COLUMN `payment_notes` TEXT NULL');
  }
  if (!have.has('payment_reminder_at')) {
    await sequelize.query('ALTER TABLE `bookings` ADD COLUMN `payment_reminder_at` DATETIME NULL');
  }
}

/** Adds `bookings.paid_amount_amd` for admin partial / prepaid tracking. */
async function ensureBookingsPaidAmountColumn(): Promise<void> {
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
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'paid_amount_amd'`,
    { type: QueryTypes.SELECT },
  );
  if (colRows.length > 0) {
    return;
  }
  await sequelize.query('ALTER TABLE `bookings` ADD COLUMN `paid_amount_amd` INT UNSIGNED NULL');
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
    DELETE s FROM \`booking_slots\` s
    INNER JOIN \`bookings\` b ON b.\`id\` = s.\`booking_id\`
    WHERE b.\`status\` NOT IN ('confirmed', 'pending', 'pending_prebook', 'pending_payment', 'completed')
       OR b.\`instructor_user_id\` IS NULL
  `);
  await sequelize.query(`
    INSERT IGNORE INTO \`booking_slots\`
      (\`booking_id\`, \`instructor_user_id\`, \`date_iso\`, \`slot_time\`, \`created_at\`, \`updated_at\`)
    SELECT \`id\`, \`instructor_user_id\`, \`date_iso\`, \`time\`, NOW(), NOW()
    FROM \`bookings\` b
    WHERE b.\`instructor_user_id\` IS NOT NULL
      AND b.\`status\` IN ('confirmed', 'pending', 'pending_prebook', 'pending_payment', 'completed')
      AND NOT EXISTS (SELECT 1 FROM \`booking_slots\` s WHERE s.\`booking_id\` = b.\`id\`)
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

async function ensureBookingsLessonCompletionColumns(): Promise<void> {
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

  if (!cols.has('lesson_completion_status')) {
    await sequelize.query(
      "ALTER TABLE `bookings` ADD COLUMN `lesson_completion_status` VARCHAR(32) NULL DEFAULT 'scheduled'",
    );
    cols = await bookingTableColumnNames();
  }

  if (!cols.has('lesson_completed_at')) {
    await sequelize.query('ALTER TABLE `bookings` ADD COLUMN `lesson_completed_at` DATETIME NULL');
    cols = await bookingTableColumnNames();
  }

  await sequelize.query(`
    UPDATE \`bookings\`
    SET \`lesson_completion_status\` = 'scheduled'
    WHERE \`lesson_completion_status\` IS NULL
      AND \`status\` IN ('confirmed', 'pending_payment', 'completed', 'pending', 'pending_prebook')
      AND \`lesson_type\` IN ('practical', 'theory_personal')
  `);
}

async function ensureBookingsPrepaidMetaColumn(): Promise<void> {
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
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'prepaid_meta'`,
    { type: QueryTypes.SELECT },
  );
  if (colRows.length > 0) {
    return;
  }
  await sequelize.query('ALTER TABLE `bookings` ADD COLUMN `prepaid_meta` JSON NULL');
}

/** Online meeting URL for personal theory (`theory_personal`) bookings. */
async function ensureBookingsMeetLinkColumn(): Promise<void> {
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
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'meet_link'`,
    { type: QueryTypes.SELECT },
  );
  if (colRows.length > 0) {
    return;
  }
  await sequelize.query('ALTER TABLE `bookings` ADD COLUMN `meet_link` VARCHAR(512) NULL DEFAULT NULL');
}

/** Indexes for admin bookings list filters and pagination. */
async function ensureBookingsAdminListIndexes(): Promise<void> {
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
  const specs: Array<{ name: string; sql: string }> = [
    {
      name: 'bookings_branch_created_id_idx',
      sql: 'CREATE INDEX `bookings_branch_created_id_idx` ON `bookings` (`branch_id`, `created_at` DESC, `id` DESC)',
    },
    {
      name: 'bookings_status_idx',
      sql: 'CREATE INDEX `bookings_status_idx` ON `bookings` (`status`)',
    },
    {
      name: 'bookings_lesson_type_idx',
      sql: 'CREATE INDEX `bookings_lesson_type_idx` ON `bookings` (`lesson_type`)',
    },
    {
      name: 'bookings_student_user_id_idx',
      sql: 'CREATE INDEX `bookings_student_user_id_idx` ON `bookings` (`student_user_id`)',
    },
    {
      name: 'bookings_instructor_user_id_idx',
      sql: 'CREATE INDEX `bookings_instructor_user_id_idx` ON `bookings` (`instructor_user_id`)',
    },
  ];
  for (const spec of specs) {
    const existing = await sequelize.query<{ INDEX_NAME: string }>(
      `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND INDEX_NAME = :name
       LIMIT 1`,
      { type: QueryTypes.SELECT, replacements: { name: spec.name } },
    );
    if (existing.length > 0) continue;
    await sequelize.query(spec.sql);
  }
}

/**
 * Lets staff delete an instructor user while keeping booking rows: null `instructor_user_id` and
 * `ON DELETE SET NULL` on the FK to `users`.
 */
async function ensureBookingsInstructorUserIdOnDeleteSetNull(): Promise<void> {
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
  const colRows = await sequelize.query<{ IS_NULLABLE: 'YES' | 'NO' }>(
    `SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'instructor_user_id'`,
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
       AND rc.TABLE_NAME = 'bookings'
       AND kcu.COLUMN_NAME = 'instructor_user_id'
       AND kcu.REFERENCED_TABLE_NAME = 'users'`,
    { type: QueryTypes.SELECT },
  );
  if (nullable && fkRows.length === 1 && fkRows[0]!.DELETE_RULE === 'SET NULL') {
    return;
  }
  for (const row of fkRows) {
    const name = row.CONSTRAINT_NAME.replace(/`/g, '');
    await sequelize.query(`ALTER TABLE \`bookings\` DROP FOREIGN KEY \`${name}\``);
  }
  if (!nullable) {
    await sequelize.query(
      'ALTER TABLE `bookings` MODIFY COLUMN `instructor_user_id` INT UNSIGNED NULL',
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
       AND rc.TABLE_NAME = 'bookings'
       AND kcu.COLUMN_NAME = 'instructor_user_id'
       AND kcu.REFERENCED_TABLE_NAME = 'users'`,
    { type: QueryTypes.SELECT },
  );
  if (remaining.some((r) => r.DELETE_RULE === 'SET NULL')) {
    return;
  }
  for (const row of remaining) {
    const name = row.CONSTRAINT_NAME.replace(/`/g, '');
    await sequelize.query(`ALTER TABLE \`bookings\` DROP FOREIGN KEY \`${name}\``);
  }
  await sequelize.query(
    'ALTER TABLE `bookings` ADD CONSTRAINT `bookings_instructor_user_id_fk` ' +
      'FOREIGN KEY (`instructor_user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE SET NULL',
  );
}

/** Slot rows duplicate instructor id for uniqueness; keep nullable when instructor user is removed. */
async function ensureBookingSlotsInstructorUserIdNullable(): Promise<void> {
  if (sequelize.getDialect() !== 'mysql') {
    return;
  }
  const tableRows = await sequelize.query<{ TABLE_NAME: string }>(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'booking_slots'`,
    { type: QueryTypes.SELECT },
  );
  if (tableRows.length === 0) {
    return;
  }
  const colRows = await sequelize.query<{ IS_NULLABLE: 'YES' | 'NO' }>(
    `SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'booking_slots' AND COLUMN_NAME = 'instructor_user_id'`,
    { type: QueryTypes.SELECT },
  );
  if (colRows.length === 0 || colRows[0]!.IS_NULLABLE === 'YES') {
    return;
  }
  await sequelize.query(
    'ALTER TABLE `booking_slots` MODIFY COLUMN `instructor_user_id` INT UNSIGNED NULL',
  );
}

/** In-app notifications table with read/unread indexes and optional dedupe key. */
async function ensureNotificationsTable(): Promise<void> {
  if (sequelize.getDialect() !== 'mysql') {
    return;
  }
  const t = await sequelize.query<{ TABLE_NAME: string }>(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications'`,
    { type: QueryTypes.SELECT },
  );
  if (t.length === 0) {
    return;
  }
  const ensureIdx = async (name: string, ddl: string) => {
    const idx = await sequelize.query<{ INDEX_NAME: string }>(
      `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND INDEX_NAME = ?`,
      { replacements: [name], type: QueryTypes.SELECT },
    );
    if (idx.length > 0) return;
    await sequelize.query(ddl);
  };
  await ensureIdx(
    'notifications_recipient_read_created_idx',
    'CREATE INDEX `notifications_recipient_read_created_idx` ON `notifications` (`recipient_user_id`, `is_read`, `created_at`)',
  );
  await ensureIdx(
    'notifications_recipient_created_idx',
    'CREATE INDEX `notifications_recipient_created_idx` ON `notifications` (`recipient_user_id`, `created_at`)',
  );
  await ensureIdx('notifications_type_idx', 'CREATE INDEX `notifications_type_idx` ON `notifications` (`type`)');
}

/** Extend `notifications.type` ENUM when new values are added to {@link NOTIFICATION_TYPES}. */
async function ensureNotificationsTypeEnumValues(): Promise<void> {
  if (sequelize.getDialect() !== 'mysql') {
    return;
  }
  const t = await sequelize.query<{ TABLE_NAME: string }>(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications'`,
    { type: QueryTypes.SELECT },
  );
  if (t.length === 0) {
    return;
  }
  const col = await sequelize.query<{ COLUMN_TYPE: string }>(
    `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'type'`,
    { type: QueryTypes.SELECT },
  );
  if (col.length === 0) {
    return;
  }
  const columnType = col[0]!.COLUMN_TYPE;
  const missingType = NOTIFICATION_TYPES.some((v) => !columnType.includes(v));
  if (!missingType) {
    return;
  }
  const literals = NOTIFICATION_TYPES.map((v) => `'${v.replace(/'/g, "''")}'`).join(', ');
  await sequelize.query(`ALTER TABLE \`notifications\` MODIFY COLUMN \`type\` ENUM(${literals}) NOT NULL`);
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

/** Derived display fields removed — location comes from branches/cities; car/transmission from fleet links. */
async function ensureInstructorProfilesDropRedundantDisplayColumns(): Promise<void> {
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
  const dropIfExists = async (columnName: string) => {
    const colRows = await sequelize.query<{ COLUMN_NAME: string }>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'instructor_profiles' AND COLUMN_NAME = ?`,
      { replacements: [columnName], type: QueryTypes.SELECT },
    );
    if (colRows.length === 0) {
      return;
    }
    await sequelize.query(`ALTER TABLE \`instructor_profiles\` DROP COLUMN \`${columnName}\``);
  };
  await dropIfExists('location');
  await dropIfExists('car_label');
  await dropIfExists('transmission');
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

/** `session_start_time` / `session_end_time` — local HH:MM for when the group’s theory class runs. */
async function ensureTheoryCohortSessionTimeColumns(): Promise<void> {
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
  const addTimeCol = async (column: string) => {
    const colRows = await sequelize.query<{ COLUMN_NAME: string }>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'theory_cohorts' AND COLUMN_NAME = ?`,
      { replacements: [column], type: QueryTypes.SELECT },
    );
    if (colRows.length > 0) {
      return;
    }
    await sequelize.query(
      `ALTER TABLE \`theory_cohorts\` ADD COLUMN \`${column}\` VARCHAR(5) NULL`,
    );
  };
  await addTimeCol('session_start_time');
  await addTimeCol('session_end_time');
}

/** Fixed group-theory course price (AMD); null = use instructor hourly × hours when booking. */
/** `lesson_weekdays`, `total_lessons`, `instructor_user_id` on theory cohorts. */
async function ensureTheoryCohortScheduleFields(): Promise<void> {
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
  const addCol = async (column: string, ddl: string) => {
    const colRows = await sequelize.query<{ COLUMN_NAME: string }>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'theory_cohorts' AND COLUMN_NAME = ?`,
      { replacements: [column], type: QueryTypes.SELECT },
    );
    if (colRows.length > 0) return;
    await sequelize.query(`ALTER TABLE \`theory_cohorts\` ADD COLUMN ${ddl}`);
  };
  await addCol('lesson_weekdays', '`lesson_weekdays` VARCHAR(32) NOT NULL DEFAULT \'\'');
  await addCol('total_lessons', '`total_lessons` INT UNSIGNED NOT NULL DEFAULT 0');
  await addCol('instructor_user_id', '`instructor_user_id` INT UNSIGNED NULL DEFAULT NULL');
}

async function ensureTheoryCohortSessionsTable(): Promise<void> {
  if (sequelize.getDialect() !== 'mysql') {
    return;
  }
  const tableRows = await sequelize.query<{ TABLE_NAME: string }>(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'theory_cohort_sessions'`,
    { type: QueryTypes.SELECT },
  );
  if (tableRows.length > 0) {
    return;
  }
  // eslint-disable-next-line no-console
  console.info('[migrate] Creating table theory_cohort_sessions …');
  await sequelize.query(`
    CREATE TABLE \`theory_cohort_sessions\` (
      \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`cohort_id\` INT UNSIGNED NOT NULL,
      \`branch_id\` INT UNSIGNED NOT NULL,
      \`instructor_user_id\` INT UNSIGNED NULL DEFAULT NULL,
      \`date_iso\` DATE NOT NULL,
      \`start_time\` VARCHAR(5) NOT NULL,
      \`end_time\` VARCHAR(5) NOT NULL,
      \`lesson_index\` INT UNSIGNED NOT NULL,
      \`status\` VARCHAR(32) NOT NULL DEFAULT 'scheduled',
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uq_theory_cohort_session_slot\` (\`cohort_id\`, \`date_iso\`, \`start_time\`),
      KEY \`idx_theory_cohort_session_order\` (\`cohort_id\`, \`lesson_index\`),
      KEY \`idx_theory_cohort_session_date\` (\`date_iso\`),
      KEY \`idx_theory_cohort_session_branch_date\` (\`branch_id\`, \`date_iso\`),
      KEY \`idx_theory_cohort_session_instructor_date\` (\`instructor_user_id\`, \`date_iso\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  // eslint-disable-next-line no-console
  console.info('[migrate] Table theory_cohort_sessions created.');
}

/** `branch_id` on theory cohorts (which branch the group belongs to). */
async function ensureTheoryCohortBranchIdColumn(): Promise<void> {
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
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'theory_cohorts' AND COLUMN_NAME = 'branch_id'`,
    { type: QueryTypes.SELECT },
  );
  if (colRows.length > 0) {
    return;
  }
  await sequelize.query(
    'ALTER TABLE `theory_cohorts` ADD COLUMN `branch_id` INT UNSIGNED NOT NULL DEFAULT 1',
  );
  const branchRows = await sequelize.query<{ id: number }>(
    'SELECT `id` FROM `branches` ORDER BY `id` ASC LIMIT 1',
    { type: QueryTypes.SELECT },
  );
  const defaultBranchId = branchRows[0]?.id;
  if (defaultBranchId != null && Number.isFinite(Number(defaultBranchId))) {
    await sequelize.query('UPDATE `theory_cohorts` SET `branch_id` = ? WHERE `branch_id` = 0 OR `branch_id` IS NULL', {
      replacements: [Math.floor(Number(defaultBranchId))],
    });
  }
}

async function ensureTheoryCohortInstructorsTable(): Promise<void> {
  if (sequelize.getDialect() !== 'mysql') {
    return;
  }
  const tableRows = await sequelize.query<{ TABLE_NAME: string }>(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'theory_cohort_instructors'`,
    { type: QueryTypes.SELECT },
  );
  if (tableRows.length > 0) {
    return;
  }
  // eslint-disable-next-line no-console
  console.info('[migrate] Creating table theory_cohort_instructors …');
  await sequelize.query(`
    CREATE TABLE \`theory_cohort_instructors\` (
      \`cohort_id\` INT UNSIGNED NOT NULL,
      \`instructor_user_id\` INT UNSIGNED NOT NULL,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`cohort_id\`, \`instructor_user_id\`),
      KEY \`idx_theory_cohort_instructor_user\` (\`instructor_user_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await sequelize.query(`
    INSERT IGNORE INTO \`theory_cohort_instructors\` (\`cohort_id\`, \`instructor_user_id\`)
    SELECT \`id\`, \`instructor_user_id\`
    FROM \`theory_cohorts\`
    WHERE \`instructor_user_id\` IS NOT NULL AND \`instructor_user_id\` > 0
  `);
  // eslint-disable-next-line no-console
  console.info('[migrate] Table theory_cohort_instructors created.');
}

async function ensureTheoryCohortPriceAmdColumn(): Promise<void> {
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
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'theory_cohorts' AND COLUMN_NAME = 'price_amd'`,
    { type: QueryTypes.SELECT },
  );
  if (colRows.length > 0) {
    return;
  }
  await sequelize.query(
    'ALTER TABLE `theory_cohorts` ADD COLUMN `price_amd` INT UNSIGNED NULL DEFAULT NULL',
  );
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
  /** Before `sync()`: legacy `finance_transactions` may lack columns that index DDL references (`booking_id`, …). */
  await ensureFinanceTransactionsBookingIdColumn();
  await ensureFinanceTransactionsEntryColumns();
  await ensureFinanceTransactionsRefundColumns();
  await ensureFinanceTransactionsBookingRefundExpenseKind();
  await sequelize.sync({ alter: config.MYSQL.SYNC_ALTER });
  await ensureBookingsInstructorUserIdOnDeleteSetNull();
  await ensureBookingSlotsInstructorUserIdNullable();
  await ensureInstructorProfilesDropScheduleColumn();
  await ensureInstructorProfilesDropRedundantDisplayColumns();
  await ensureTheoryCohortsDropScheduleColumn();
  await ensureTheoryCohortSessionTimeColumns();
  await ensureTheoryCohortScheduleFields();
  await ensureTheoryCohortSessionsTable();
  await ensureTheoryCohortBranchIdColumn();
  await ensureTheoryCohortPriceAmdColumn();
  await ensureTheoryCohortInstructorsTable();
  await migrateLegacyInstructorAvailabilityBlocksTable();
  await ensurePackagesImageUrlColumn();
  await ensurePackagesTheoryLessonsColumn();
  await ensurePackageOrdersTable();
  await ensurePackageLessonBalancesTable();
  await ensureStudentProfilesTheoryLessonColumns();
  await ensureUsersPasswordResetColumns();
  await ensureUsersIsActiveColumn();
  await ensureCarExpensesDropPaymentColumns();
  await ensureCarExpensesTitleColumn();
  await ensureFinanceExpensesTable();
  await ensurePetrolExpensesTable();
  await ensurePetrolExpensesTypeAndNullableCount();
  await ensurePetrolConsumptionsTable();
  await ensurePetrolConsumptionsPetrolAmountNullable();
  await ensureBookingsPaymentColumns();
  await ensureBookingsPaidAmountColumn();
  await ensureBookingsPaymentNotesAndReminderAtColumns();
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
  await ensureBookingsLessonCompletionColumns();
  await ensureBookingsPrepaidMetaColumn();
  await ensureBookingsMeetLinkColumn();
  await ensureBookingsAdminListIndexes();
  await ensureNotificationsTable();
  await ensureNotificationsTypeEnumValues();
  await ensureStudentProfilesPackageIdOnDeleteSetNull();
  await ensureStudentExamStatsTable();
  await ensurePersonalTheoryLessonRequestsTable();
}

async function ensurePersonalTheoryLessonRequestsTable(): Promise<void> {
  if (sequelize.getDialect() !== 'mysql') {
    return;
  }
  const tableRows = await sequelize.query<{ TABLE_NAME: string }>(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'personal_theory_lesson_requests'`,
    { type: QueryTypes.SELECT },
  );
  if (tableRows.length > 0) {
    return;
  }
  // eslint-disable-next-line no-console
  console.info('[migrate] Creating table personal_theory_lesson_requests …');
  await sequelize.query(`
    CREATE TABLE \`personal_theory_lesson_requests\` (
      \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`student_user_id\` INT UNSIGNED NOT NULL,
      \`instructor_user_id\` INT UNSIGNED NOT NULL,
      \`branch_id\` INT UNSIGNED NOT NULL,
      \`note\` TEXT NULL,
      \`selected_themes\` JSON NULL,
      \`status\` ENUM('pending', 'contacted', 'booked', 'cancelled') NOT NULL DEFAULT 'pending',
      \`booked_lesson_id\` INT UNSIGNED NULL,
      \`handled_by_admin_id\` INT UNSIGNED NULL,
      \`contacted_at\` DATETIME NULL,
      \`cancelled_at\` DATETIME NULL,
      \`booked_at\` DATETIME NULL,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`personal_theory_lesson_requests_student_status\` (\`student_user_id\`, \`status\`),
      KEY \`personal_theory_lesson_requests_instructor_status\` (\`instructor_user_id\`, \`status\`),
      KEY \`personal_theory_lesson_requests_status_created\` (\`status\`, \`created_at\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}
