import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import {
  Blog,
  Booking,
  Branch,
  City,
  ExamQuestion,
  FinanceTransaction,
  FleetCar,
  InstructorScheduleRule,
  InstructorBranch,
  InstructorProfile,
  Package,
  StudentExtraPractical,
  StudentProfile,
  TheoryCohort,
  TheoryCohortEnrollment,
  User,
} from '../models';
import { EXAM_QUESTION_SEED } from './examPool';

const DEMO_PASSWORD = 'demo1234';

async function hashDemo(): Promise<string> {
  return bcrypt.hash(DEMO_PASSWORD, 10);
}

/** Demo panel accounts — password for all is `DEMO_PASSWORD` (see env / docs). */
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
  { email: 'ani@example.com', name: 'Ani Karapetyan', accountType: 'student', phone: '+374 99 111 222' },
  { email: 'tigran@example.com', name: 'Tigran Mkhitaryan', accountType: 'student', phone: '+374 77 333 444' },
  { email: 'nare@example.com', name: 'Nare Harutyunyan', accountType: 'student', phone: '+374 55 555 666' },
  { email: 'suren@example.com', name: 'Suren Danielyan', accountType: 'student', phone: '+374 98 777 888' },
  { email: 'mane@example.com', name: 'Mane Poghosyan', accountType: 'student', phone: '+374 91 999 000' },
  { email: 'artak@example.com', name: 'Artak Sargsyan', accountType: 'student', phone: '+374 95 123 456' },
  { email: 'armen.p@vivadrive.am', name: 'Armen Petrosyan', accountType: 'instructor', phone: '+374 99 111 111' },
  { email: 'narine.h@vivadrive.am', name: 'Narine Hovhannisyan', accountType: 'instructor', phone: '+374 77 222 222' },
  { email: 'vardan.g@vivadrive.am', name: 'Vardan Grigoryan', accountType: 'instructor', phone: '+374 55 333 333' },
  { email: 'lilit.s@vivadrive.am', name: 'Lilit Sargsyan', accountType: 'instructor', phone: '+374 91 444 444' },
  { email: 'hov.m@vivadrive.am', name: 'Hovhannes Mkrtchyan', accountType: 'instructor', phone: '+374 95 555 555' },
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

  const cityYerevan = await City.create({ name: 'Երևան' });
  const cityMasis = await City.create({ name: 'Մասիս' });

  const brGaregin = await Branch.create({
    cityId: cityYerevan.id,
    name: 'Գարեգին Նժդեհ 8',
    mapUrl:
      'https://maps.google.com/maps?q=%D4%B3%D5%A1%D6%80%D5%A5%D5%A3%D5%AB%D5%B6%20%D5%86%D5%AA%D5%A4%D5%A5%D5%B0%208%2C%20Yerevan&z=16&output=embed',
    phone: '+374 10 123 456',
    email: 'info@vivadrive.am',
    workHours: 'Mon–Fri: 9:00–18:00; Sat: 9:00–15:00',
  });
  const brAzat = await Branch.create({
    cityId: cityYerevan.id,
    name: 'Ազատամարտիկների 75/1',
    mapUrl:
      'https://maps.google.com/maps?q=%D4%B1%D5%A6%D5%A1%D5%BF%D5%A1%D5%B4%D5%A1%D6%80%D5%BF%D5%AB%D5%AF%D5%B6%D5%A5%D6%80%D5%AB%2075%2F1%2C%20Yerevan&z=16&output=embed',
    phone: '+374 99 123 456',
    email: 'support@vivadrive.am',
    workHours: 'Mon–Fri: 9:00–18:00',
  });
  const brMasis = await Branch.create({
    cityId: cityMasis.id,
    name: 'Ք.Մասիս Երևանյան 125',
    mapUrl:
      'https://maps.google.com/maps?q=%D5%94.%D5%84%D5%A1%D5%BD%D5%AB%D5%BD%20%D4%B5%D6%80%D6%87%D5%A1%D5%B6%D5%B5%D5%A1%D5%B6%20125&z=16&output=embed',
    phone: '+374 10 123 456',
    email: 'info@vivadrive.am',
    workHours: 'Mon–Fri: 9:00–18:00; Sat: 9:00–15:00',
  });

  const pkg1 = await Package.create({
    name: 'Basic',
    priceDisplay: '35,000',
    lessons: 10,
    status: 'active',
    featuresJson: JSON.stringify(['Practical lessons', 'Theory access', 'Certificate']),
  });
  const pkg2 = await Package.create({
    name: 'Standard',
    priceDisplay: '55,000',
    lessons: 18,
    status: 'active',
    featuresJson: JSON.stringify(['Practical lessons', 'Theory access', 'Practice exam', 'Certificate']),
  });
  const pkg3 = await Package.create({
    name: 'Premium',
    priceDisplay: '85,000',
    lessons: 28,
    status: 'active',
    featuresJson: JSON.stringify(['All in Standard', 'Priority booking', 'Unlimited practice exams']),
  });
  const pkg4 = await Package.create({
    name: 'Refresher',
    priceDisplay: '18,000',
    lessons: 5,
    status: 'active',
    featuresJson: JSON.stringify(['Skills assessment', 'Targeted lessons']),
  });

  await User.bulkCreate(
    DEMO_USERS_SEED.map((u) => ({
      ...u,
      passwordHash,
    })),
  );

  const emails = DEMO_USERS_SEED.map((u) => u.email);
  const userRows = await User.findAll({ where: { email: { [Op.in]: emails } } });
  const userId = (email: string): number => {
    const u = userRows.find((r) => r.email === email);
    if (!u) throw new Error(`Seed: missing user ${email}`);
    return u.id;
  };

  const INS001 = userId('armen.p@vivadrive.am');
  const INS002 = userId('narine.h@vivadrive.am');
  const INS003 = userId('vardan.g@vivadrive.am');
  const INS004 = userId('lilit.s@vivadrive.am');
  const INS005 = userId('hov.m@vivadrive.am');
  const accInstructor = userId('instructor@vivadrive.am');
  const USR001 = userId('ani@example.com');
  const USR002 = userId('tigran@example.com');
  const USR003 = userId('nare@example.com');
  const USR004 = userId('suren@example.com');
  const USR005 = userId('mane@example.com');
  const USR006 = userId('artak@example.com');
  const USR_DEMO = userId('student@example.com');

  await InstructorProfile.bulkCreate([
    {
      userId: INS001,
      years: 12,
      rating: 4.9,
      hourlyPrice: 7000,
      schedule: 'Mon-Sat',
      location: 'Yerevan',
      carLabel: 'Toyota Corolla',
      transmission: 'Manual',
      imageSrc: '/logo.jpg',
      teachesPractical: true,
      teachesTheory: false,
      status: 'active',
    },
    {
      userId: INS002,
      years: 8,
      rating: 4.8,
      hourlyPrice: 6500,
      schedule: 'Mon-Fri',
      location: 'Yerevan',
      carLabel: 'Kia Rio',
      transmission: 'Automatic',
      imageSrc: '/logo.jpg',
      teachesPractical: true,
      teachesTheory: true,
      status: 'active',
    },
    {
      userId: INS003,
      years: 15,
      rating: 5.0,
      hourlyPrice: 8000,
      schedule: 'Tue-Sun',
      location: 'Yerevan',
      carLabel: 'Kia Cerato',
      transmission: 'Automatic',
      imageSrc: '/logo.jpg',
      teachesPractical: true,
      teachesTheory: false,
      status: 'active',
    },
    {
      userId: INS004,
      years: 6,
      rating: 4.7,
      hourlyPrice: 6000,
      schedule: 'Mon-Fri',
      location: 'Yerevan',
      carLabel: 'Nissan Versa',
      transmission: 'Automatic',
      imageSrc: '/logo.jpg',
      teachesPractical: false,
      teachesTheory: true,
      status: 'active',
    },
    {
      userId: INS005,
      years: 10,
      rating: 4.9,
      hourlyPrice: 7200,
      schedule: 'Mon-Sat',
      location: 'Yerevan',
      carLabel: 'Hyundai Elantra',
      transmission: 'Manual',
      imageSrc: '/logo.jpg',
      teachesPractical: true,
      teachesTheory: true,
      status: 'inactive',
    },
    {
      userId: accInstructor,
      years: 12,
      rating: 4.9,
      hourlyPrice: 7000,
      schedule: 'Mon-Sat',
      location: 'Yerevan',
      carLabel: 'Toyota Corolla',
      transmission: 'Manual',
      imageSrc: '/logo.jpg',
      teachesPractical: true,
      teachesTheory: false,
      status: 'active',
    },
  ]);

  await InstructorBranch.bulkCreate([
    { instructorUserId: INS001, branchId: brGaregin.id },
    { instructorUserId: INS001, branchId: brAzat.id },
    { instructorUserId: INS002, branchId: brGaregin.id },
    { instructorUserId: INS002, branchId: brAzat.id },
    { instructorUserId: INS002, branchId: brMasis.id },
    { instructorUserId: INS003, branchId: brGaregin.id },
    { instructorUserId: INS003, branchId: brAzat.id },
    { instructorUserId: INS005, branchId: brGaregin.id },
    { instructorUserId: INS005, branchId: brAzat.id },
    { instructorUserId: accInstructor, branchId: brGaregin.id },
    { instructorUserId: accInstructor, branchId: brAzat.id },
  ]);

  const defaultLunch = (instructorUserId: number) => ({
    instructorUserId,
    ruleKind: 'lunch' as const,
    weekday: null as null,
    dateIso: null as null,
    timeStart: '14:00',
    timeEnd: '15:00',
    allDay: false,
  });
  await InstructorScheduleRule.bulkCreate([
    defaultLunch(INS001),
    defaultLunch(INS002),
    defaultLunch(INS003),
    defaultLunch(INS005),
    defaultLunch(accInstructor),
    {
      instructorUserId: INS001,
      ruleKind: 'day_off',
      weekday: null,
      dateIso: '2026-05-14',
      timeStart: '00:00',
      timeEnd: '23:59',
      allDay: true,
    },
  ]);

  await StudentProfile.bulkCreate([
    {
      userId: USR001,
      branchId: brGaregin.id,
      packageId: pkg2.id,
      instructorUserId: INS001,
      lessonsCompleted: 4,
      lessonsTotal: 18,
      enrollmentStatus: 'active',
      skillRating: 2,
      licenseAchieved: false,
      joinedAt: '2026-03-01',
    },
    {
      userId: USR002,
      branchId: brAzat.id,
      packageId: pkg1.id,
      instructorUserId: INS003,
      lessonsCompleted: 10,
      lessonsTotal: 10,
      enrollmentStatus: 'completed',
      skillRating: 0,
      licenseAchieved: true,
      joinedAt: '2026-02-10',
    },
    {
      userId: USR003,
      branchId: brMasis.id,
      packageId: pkg3.id,
      instructorUserId: INS002,
      lessonsCompleted: 2,
      lessonsTotal: 28,
      enrollmentStatus: 'active',
      skillRating: 4,
      licenseAchieved: false,
      joinedAt: '2026-03-15',
    },
    {
      userId: USR004,
      branchId: brGaregin.id,
      packageId: pkg2.id,
      instructorUserId: INS001,
      lessonsCompleted: 0,
      lessonsTotal: 18,
      enrollmentStatus: 'inactive',
      skillRating: 1,
      licenseAchieved: false,
      joinedAt: '2026-01-20',
    },
    {
      userId: USR005,
      branchId: brAzat.id,
      packageId: pkg1.id,
      instructorUserId: INS004,
      lessonsCompleted: 6,
      lessonsTotal: 10,
      enrollmentStatus: 'active',
      skillRating: 3,
      licenseAchieved: false,
      joinedAt: '2026-03-20',
    },
    {
      userId: USR006,
      branchId: brMasis.id,
      packageId: pkg3.id,
      instructorUserId: INS003,
      lessonsCompleted: 15,
      lessonsTotal: 28,
      enrollmentStatus: 'active',
      skillRating: 6,
      licenseAchieved: false,
      joinedAt: '2026-02-01',
    },
    {
      userId: USR_DEMO,
      branchId: brGaregin.id,
      packageId: pkg2.id,
      instructorUserId: INS001,
      lessonsCompleted: 4,
      lessonsTotal: 18,
      enrollmentStatus: 'active',
      skillRating: 0,
      licenseAchieved: false,
      joinedAt: '2026-04-01',
    },
  ]);

  await Booking.bulkCreate([
    {
      studentUserId: USR001,
      instructorUserId: INS001,
      branchId: brGaregin.id,
      dateIso: '2026-03-28',
      time: '10:00',
      lessonType: 'practical',
      status: 'confirmed',
    },
    {
      studentUserId: USR002,
      instructorUserId: INS003,
      branchId: brAzat.id,
      dateIso: '2026-03-28',
      time: '14:00',
      lessonType: 'practical',
      status: 'confirmed',
    },
    {
      studentUserId: USR003,
      instructorUserId: INS002,
      branchId: brMasis.id,
      dateIso: '2026-03-29',
      time: '09:00',
      lessonType: 'theory',
      status: 'pending',
    },
    {
      studentUserId: USR004,
      instructorUserId: INS001,
      branchId: brGaregin.id,
      dateIso: '2026-03-29',
      time: '11:00',
      lessonType: 'practical',
      status: 'cancelled',
    },
    {
      studentUserId: USR005,
      instructorUserId: INS003,
      branchId: brAzat.id,
      dateIso: '2026-03-30',
      time: '16:00',
      lessonType: 'practical',
      status: 'confirmed',
    },
    {
      studentUserId: USR_DEMO,
      instructorUserId: INS001,
      branchId: brGaregin.id,
      dateIso: '2026-04-11',
      time: '10:00',
      lessonType: 'practical',
      status: 'confirmed',
    },
    {
      studentUserId: USR_DEMO,
      instructorUserId: INS002,
      branchId: brGaregin.id,
      dateIso: '2026-04-14',
      time: '14:00',
      lessonType: 'theory',
      status: 'confirmed',
    },
    {
      studentUserId: USR_DEMO,
      instructorUserId: INS001,
      branchId: brGaregin.id,
      dateIso: '2026-08-20',
      time: '09:00',
      lessonType: 'practical',
      status: 'pending',
    },
    {
      studentUserId: USR_DEMO,
      instructorUserId: INS001,
      branchId: brGaregin.id,
      dateIso: '2026-03-22',
      time: '11:00',
      lessonType: 'practical',
      status: 'confirmed',
    },
    {
      studentUserId: USR_DEMO,
      instructorUserId: INS002,
      branchId: brGaregin.id,
      dateIso: '2026-03-08',
      time: '16:00',
      lessonType: 'theory',
      status: 'confirmed',
    },
    {
      studentUserId: USR_DEMO,
      instructorUserId: INS001,
      branchId: brGaregin.id,
      dateIso: '2026-02-26',
      time: '15:00',
      lessonType: 'practical',
      status: 'cancelled',
    },
  ]);

  const bkPendingTheory = await Booking.findOne({
    where: { studentUserId: USR003, branchId: brMasis.id, lessonType: 'theory', status: 'pending' },
  });
  if (!bkPendingTheory) {
    throw new Error('Seed: expected pending theory booking');
  }

  const coh12 = await TheoryCohort.create({
    name: 'Theory Cohort 12',
    startDateIso: '2026-03-20',
    endDateIso: '2026-04-10',
    schedule: 'Tue & Thu, 18:00–20:00',
    seats: 12,
    instructorName: 'Narine Hovhannisyan',
    meetLink: 'https://meet.google.com/abc-def',
    status: 'active',
    branchId: brGaregin.id,
  });
  const coh13 = await TheoryCohort.create({
    name: 'Theory Cohort 13',
    startDateIso: '2026-04-15',
    endDateIso: '2026-05-05',
    schedule: 'Mon & Wed, 18:00–20:00',
    seats: 15,
    instructorName: 'Vardan Grigoryan',
    meetLink: 'https://meet.google.com/xyz-123',
    status: 'upcoming',
    branchId: brAzat.id,
  });
  const coh11 = await TheoryCohort.create({
    name: 'Theory Cohort 11',
    startDateIso: '2026-02-01',
    endDateIso: '2026-02-21',
    schedule: 'Mon & Wed, 17:00–19:00',
    seats: 12,
    instructorName: 'Narine Hovhannisyan',
    meetLink: '',
    status: 'completed',
    branchId: brMasis.id,
  });

  await TheoryCohortEnrollment.bulkCreate([
    { cohortId: coh12.id, studentUserId: USR001 },
    { cohortId: coh12.id, studentUserId: USR002 },
    { cohortId: coh12.id, studentUserId: USR003 },
    { cohortId: coh12.id, studentUserId: USR004 },
    { cohortId: coh12.id, studentUserId: USR005 },
    { cohortId: coh13.id, studentUserId: USR001 },
    { cohortId: coh13.id, studentUserId: USR002 },
    { cohortId: coh13.id, studentUserId: USR003 },
    { cohortId: coh11.id, studentUserId: USR001 },
    { cohortId: coh11.id, studentUserId: USR002 },
    { cohortId: coh11.id, studentUserId: USR003 },
    { cohortId: coh11.id, studentUserId: USR004 },
    { cohortId: coh11.id, studentUserId: USR005 },
    { cohortId: coh11.id, studentUserId: USR006 },
    { cohortId: coh11.id, studentUserId: USR_DEMO },
  ]);

  const financeSeedRows = [
    {
      createdAt: new Date('2026-04-06T06:14:00.000Z'),
      customer: 'Ani Karapetyan',
      email: 'ani@example.com',
      description: 'Standard package',
      branchId: brGaregin.id,
      channel: 'online' as const,
      method: 'card' as const,
      grossAmd: 55000,
      feeAmd: 1650,
      status: 'completed' as const,
      providerRef: 'ARCA-7F3A-99102',
      source: 'system' as const,
    },
    {
      createdAt: new Date('2026-04-05T12:42:00.000Z'),
      customer: 'Tigran Mkhitaryan',
      email: 'tigran@example.com',
      description: 'Theory course cohort 12',
      branchId: brAzat.id,
      channel: 'online' as const,
      method: 'idram' as const,
      grossAmd: 8000,
      feeAmd: 200,
      status: 'completed' as const,
      providerRef: 'IDR-4482910',
      source: 'system' as const,
    },
    {
      createdAt: new Date('2026-04-05T07:05:00.000Z'),
      customer: 'Nare Harutyunyan',
      email: 'nare@example.com',
      description: 'Extra lesson (1×)',
      branchId: brMasis.id,
      channel: 'pos' as const,
      method: 'card' as const,
      grossAmd: 4000,
      feeAmd: 120,
      status: 'completed' as const,
      providerRef: 'POS-YVN-22041',
      source: 'system' as const,
      bookingId: bkPendingTheory.id,
    },
    {
      createdAt: new Date('2026-04-04T05:30:00.000Z'),
      customer: 'Suren Danielyan',
      email: 'suren@example.com',
      description: 'Premium package',
      branchId: brGaregin.id,
      channel: 'bank' as const,
      method: 'transfer' as const,
      grossAmd: 72000,
      feeAmd: 0,
      status: 'pending' as const,
      providerRef: 'INB-602884',
      source: 'system' as const,
    },
    {
      createdAt: new Date('2026-04-03T10:18:00.000Z'),
      customer: 'Mane Poghosyan',
      email: 'mane@example.com',
      description: 'Exam fee',
      branchId: brAzat.id,
      channel: 'online' as const,
      method: 'card' as const,
      grossAmd: 12000,
      feeAmd: 360,
      status: 'failed' as const,
      providerRef: 'ARCA-DECL-88301',
      source: 'system' as const,
    },
    {
      createdAt: new Date('2026-04-02T06:00:00.000Z'),
      customer: 'Artak Sargsyan',
      email: 'artak@example.com',
      description: 'Standard package (refunded)',
      branchId: brMasis.id,
      channel: 'online' as const,
      method: 'idram' as const,
      grossAmd: 55000,
      feeAmd: 1375,
      status: 'refunded' as const,
      providerRef: 'IDR-RFD-99102',
      source: 'system' as const,
    },
  ];
  await FinanceTransaction.bulkCreate(financeSeedRows as never[], { validate: true });

  await StudentExtraPractical.create({
    userId: USR_DEMO,
    practicalTotal: 3,
    practicalUsed: 1,
    purchasedAt: '2026-03-15',
  });

  await Blog.bulkCreate([
    {
      slug: 'tips-for-your-first-driving-lesson',
      title: 'Tips for your first driving lesson',
      excerpt:
        'What to bring, what to expect, and how to get the most from your first session with an instructor.',
      bodyHtml:
        '<p>Your first lesson sets the tone for your training. Arrive rested, wear comfortable shoes, and bring your learner permit if you already have one.</p>' +
        '<p>Listen carefully to vehicle controls and ask questions early — your instructor prefers clarifying doubts before you move. Stay calm: mistakes are part of learning.</p>' +
        '<p>After the lesson, note what felt difficult so you can focus on it next time.</p>',
      coverImage: null,
      published: true,
      publishedAt: new Date('2026-01-10T09:00:00.000Z'),
    },
    {
      slug: 'theory-exam-how-to-prepare',
      title: 'Theory exam: how to prepare effectively',
      excerpt: 'A practical study plan using topic practice, mock exams, and spaced repetition.',
      bodyHtml:
        '<p>Mix full mock exams with focused topic sessions. Review every wrong answer and read the explanation, not just the correct option.</p>' +
        '<p>Short daily sessions beat rare long cramming. Use road sign drills until recognition is instant.</p>' +
        '<p>When you consistently pass mocks under time pressure, you are ready for the official test.</p>',
      coverImage: null,
      published: true,
      publishedAt: new Date('2026-02-01T12:00:00.000Z'),
    },
  ]);

  const examRows = EXAM_QUESTION_SEED.map((q) => {
    const ext = q as typeof q & { topicId?: string; imageUrl?: string | null };
    return {
      category: q.category,
      topicId: ext.topicId ?? null,
      correctIndex: q.correctIndex,
      imageUrl: ext.imageUrl ?? null,
      textJson: JSON.stringify(q.text),
      optionsJson: JSON.stringify(q.options),
      optionExplanationsJson: q.optionExplanations ? JSON.stringify(q.optionExplanations) : null,
    };
  });
  await ExamQuestion.bulkCreate(examRows);

  await FleetCar.create({
    plate: '00 AA 000',
    make: 'Toyota',
    model: 'Corolla',
    year: 2022,
    transmission: 'manual',
    notes: 'Demo fleet vehicle',
  });
}
