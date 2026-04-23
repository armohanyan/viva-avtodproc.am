import bcrypt from 'bcryptjs';
import {
  Branch,
  City,
  InstructorBranch,
  InstructorProfile,
  InstructorScheduleRule,
  Package,
  StudentProfile,
  User,
} from '../models';

const DEMO_PASSWORD = 'demo1234';

async function hashDemo(): Promise<string> {
  return bcrypt.hash(DEMO_PASSWORD, 10);
}

/** Demo logins — password for all is `DEMO_PASSWORD` (see env / docs). */
const DEMO_USERS_SEED: Array<{
  email: string;
  name: string;
  accountType: 'super_admin' | 'admin' | 'instructor' | 'student';
  phone?: string;
}> = [
  { email: 'superadmin@vivadrive.am', name: 'Super Admin', accountType: 'super_admin' },
  { email: 'admin@vivadrive.am', name: 'School Admin', accountType: 'admin' },
  { email: 'instructor@vivadrive.am', name: 'Demo Instructor', accountType: 'instructor' },
  { email: 'student@example.com', name: 'Demo Student', accountType: 'student', phone: '+374 00 000 000' },
];

/** When cities/packages already exist but `users` was wiped, recreate demo logins only. */
async function seedDemoUserAccountsIfMissing(): Promise<void> {
  if ((await User.count()) > 0) {
    return;
  }
  const passwordHash = await hashDemo();
  await User.bulkCreate(
    DEMO_USERS_SEED.map((u) => ({
      ...u,
      passwordHash,
    })),
  );
}

export async function seedDatabaseIfEmpty(): Promise<void> {
  const cityCount = await City.count();
  const userCount = await User.count();
  if (cityCount > 0 && userCount > 0) {
    return;
  }
  if (cityCount > 0 && userCount === 0) {
    await seedDemoUserAccountsIfMissing();
    return;
  }

  const passwordHash = await hashDemo();

  const city = await City.create({ name: 'Երևան' });

  const branch = await Branch.create({
    cityId: city.id,
    name: 'Գարեգին Նժդեհ 8',
    mapUrl:
      'https://maps.google.com/maps?q=%D4%B3%D5%A1%D6%80%D5%A5%D5%A3%D5%AB%D5%B6%20%D5%86%D5%AA%D5%A4%D5%A5%D5%B0%208%2C%20Yerevan&z=16&output=embed',
    phone: '+374 10 123 456',
    email: 'info@vivadrive.am',
    workHours: 'Mon–Fri: 9:00–18:00; Sat: 9:00–15:00',
  });

  const pkg = await Package.create({
    name: 'Standard',
    priceDisplay: '55,000',
    lessons: 18,
    theoryLessons: 12,
    status: 'active',
    featuresJson: JSON.stringify(['Practical lessons', 'Theory access', 'Practice exam', 'Certificate']),
  });

  await User.bulkCreate(
    DEMO_USERS_SEED.map((u) => ({
      ...u,
      passwordHash,
    })),
  );

  const instructorUser = await User.findOne({ where: { email: 'instructor@vivadrive.am' } });
  const studentUser = await User.findOne({ where: { email: 'student@example.com' } });
  if (!instructorUser || !studentUser) {
    throw new Error('Seed: expected demo instructor and student users');
  }

  await InstructorProfile.create({
    userId: instructorUser.id,
    years: 12,
    rating: 4.9,
    hourlyPrice: 7000,
    location: 'Yerevan',
    carLabel: 'Toyota Corolla',
    transmission: 'Manual',
    imageSrc: '/logo.jpg',
    teachesPractical: true,
    teachesTheory: false,
    status: 'active',
  });

  await InstructorBranch.create({
    instructorUserId: instructorUser.id,
    branchId: branch.id,
  });

  await InstructorScheduleRule.create({
    instructorUserId: instructorUser.id,
    ruleKind: 'lunch',
    weekday: null,
    dateIso: null,
    timeStart: '14:00',
    timeEnd: '15:00',
    allDay: false,
  });

  await StudentProfile.create({
    userId: studentUser.id,
    branchId: branch.id,
    packageId: pkg.id,
    instructorUserId: instructorUser.id,
    lessonsCompleted: 0,
    lessonsTotal: pkg.lessons,
    theoryLessonsCompleted: 2,
    theoryLessonsTotal: 12,
    enrollmentStatus: 'active',
    skillRating: 0,
    licenseAchieved: false,
    joinedAt: '2026-04-01',
  });
}
