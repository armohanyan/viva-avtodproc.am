import bcrypt from 'bcryptjs';
import {
  Blog,
  Booking,
  Branch,
  City,
  ExamQuestion,
  FinanceTransaction,
  FleetCar,
  InstructorAvailabilityBlock,
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
  id: string;
  email: string;
  name: string;
  accountType: 'super_admin' | 'admin' | 'instructor' | 'student';
  phone?: string;
}> = [
  { id: 'acc-superadmin', email: 'superadmin@vivadrive.am', name: 'Super Admin', accountType: 'super_admin' },
  { id: 'acc-admin', email: 'admin@vivadrive.am', name: 'School Admin', accountType: 'admin' },
  { id: 'acc-instructor', email: 'instructor@vivadrive.am', name: 'Demo Instructor', accountType: 'instructor' },
  { id: 'USR-DEMO', email: 'student@example.com', name: 'Demo Student', accountType: 'student', phone: '+374 00 000 000' },
  { id: 'USR-001', email: 'ani@example.com', name: 'Ani Karapetyan', accountType: 'student', phone: '+374 99 111 222' },
  { id: 'USR-002', email: 'tigran@example.com', name: 'Tigran Mkhitaryan', accountType: 'student', phone: '+374 77 333 444' },
  { id: 'USR-003', email: 'nare@example.com', name: 'Nare Harutyunyan', accountType: 'student', phone: '+374 55 555 666' },
  { id: 'USR-004', email: 'suren@example.com', name: 'Suren Danielyan', accountType: 'student', phone: '+374 98 777 888' },
  { id: 'USR-005', email: 'mane@example.com', name: 'Mane Poghosyan', accountType: 'student', phone: '+374 91 999 000' },
  { id: 'USR-006', email: 'artak@example.com', name: 'Artak Sargsyan', accountType: 'student', phone: '+374 95 123 456' },
  { id: 'INS-001', email: 'armen.p@vivadrive.am', name: 'Armen Petrosyan', accountType: 'instructor', phone: '+374 99 111 111' },
  { id: 'INS-002', email: 'narine.h@vivadrive.am', name: 'Narine Hovhannisyan', accountType: 'instructor', phone: '+374 77 222 222' },
  { id: 'INS-003', email: 'vardan.g@vivadrive.am', name: 'Vardan Grigoryan', accountType: 'instructor', phone: '+374 55 333 333' },
  { id: 'INS-004', email: 'lilit.s@vivadrive.am', name: 'Lilit Sargsyan', accountType: 'instructor', phone: '+374 91 444 444' },
  { id: 'INS-005', email: 'hov.m@vivadrive.am', name: 'Hovhannes Mkrtchyan', accountType: 'instructor', phone: '+374 95 555 555' },
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

  await City.bulkCreate([
    { id: 'city-yerevan', name: 'Երևան' },
    { id: 'city-masis', name: 'Մասիս' },
  ]);

  await Branch.bulkCreate([
    {
      id: 'br-garegin-8',
      cityId: 'city-yerevan',
      name: 'Գարեգին Նժդեհ 8',
      mapUrl:
        'https://maps.google.com/maps?q=%D4%B3%D5%A1%D6%80%D5%A5%D5%A3%D5%AB%D5%B6%20%D5%86%D5%AA%D5%A4%D5%A5%D5%B0%208%2C%20Yerevan&z=16&output=embed',
      phone: '+374 10 123 456',
      email: 'info@vivadrive.am',
      workHours: 'Mon–Fri: 9:00–18:00; Sat: 9:00–15:00',
    },
    {
      id: 'br-azatamart-75',
      cityId: 'city-yerevan',
      name: 'Ազատամարտիկների 75/1',
      mapUrl:
        'https://maps.google.com/maps?q=%D4%B1%D5%A6%D5%A1%D5%BF%D5%A1%D5%B4%D5%A1%D6%80%D5%BF%D5%AB%D5%AF%D5%B6%D5%A5%D6%80%D5%AB%2075%2F1%2C%20Yerevan&z=16&output=embed',
      phone: '+374 99 123 456',
      email: 'support@vivadrive.am',
      workHours: 'Mon–Fri: 9:00–18:00',
    },
    {
      id: 'br-masis-125',
      cityId: 'city-masis',
      name: 'Ք.Մասիս Երևանյան 125',
      mapUrl:
        'https://maps.google.com/maps?q=%D5%94.%D5%84%D5%A1%D5%BD%D5%AB%D5%BD%20%D4%B5%D6%80%D6%87%D5%A1%D5%B6%D5%B5%D5%A1%D5%B6%20125&z=16&output=embed',
      phone: '+374 10 123 456',
      email: 'info@vivadrive.am',
      workHours: 'Mon–Fri: 9:00–18:00; Sat: 9:00–15:00',
    },
  ]);

  await Package.bulkCreate([
    {
      id: 'PKG-001',
      name: 'Basic',
      priceDisplay: '35,000',
      lessons: 10,
      status: 'active',
      featuresJson: JSON.stringify(['Practical lessons', 'Theory access', 'Certificate']),
    },
    {
      id: 'PKG-002',
      name: 'Standard',
      priceDisplay: '55,000',
      lessons: 18,
      status: 'active',
      featuresJson: JSON.stringify(['Practical lessons', 'Theory access', 'Practice exam', 'Certificate']),
    },
    {
      id: 'PKG-003',
      name: 'Premium',
      priceDisplay: '85,000',
      lessons: 28,
      status: 'active',
      featuresJson: JSON.stringify(['All in Standard', 'Priority booking', 'Unlimited practice exams']),
    },
    {
      id: 'PKG-004',
      name: 'Refresher',
      priceDisplay: '18,000',
      lessons: 5,
      status: 'active',
      featuresJson: JSON.stringify(['Skills assessment', 'Targeted lessons']),
    },
  ]);

  await User.bulkCreate(
    DEMO_USERS_SEED.map((u) => ({
      ...u,
      passwordHash,
    })),
  );

  await InstructorProfile.bulkCreate([
    {
      userId: 'INS-001',
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
      userId: 'INS-002',
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
      userId: 'INS-003',
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
      userId: 'INS-004',
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
      userId: 'INS-005',
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
      userId: 'acc-instructor',
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
    { instructorUserId: 'INS-001', branchId: 'br-garegin-8' },
    { instructorUserId: 'INS-001', branchId: 'br-azatamart-75' },
    { instructorUserId: 'INS-002', branchId: 'br-garegin-8' },
    { instructorUserId: 'INS-002', branchId: 'br-azatamart-75' },
    { instructorUserId: 'INS-002', branchId: 'br-masis-125' },
    { instructorUserId: 'INS-003', branchId: 'br-garegin-8' },
    { instructorUserId: 'INS-003', branchId: 'br-azatamart-75' },
    { instructorUserId: 'INS-005', branchId: 'br-garegin-8' },
    { instructorUserId: 'INS-005', branchId: 'br-azatamart-75' },
    { instructorUserId: 'acc-instructor', branchId: 'br-garegin-8' },
    { instructorUserId: 'acc-instructor', branchId: 'br-azatamart-75' },
  ]);

  await InstructorAvailabilityBlock.bulkCreate([
    {
      id: 'IAB-SEED-01',
      instructorUserId: 'INS-001',
      ruleKind: 'weekday_lunch' as const,
      weekday: null,
      dateIso: null,
      timeStart: '14:00',
      timeEnd: '15:00',
      allDay: false,
    },
    {
      id: 'IAB-SEED-06',
      instructorUserId: 'INS-001',
      ruleKind: 'date_off',
      weekday: null,
      dateIso: '2026-05-14',
      timeStart: '00:00',
      timeEnd: '23:59',
      allDay: true,
    },
  ]);

  await StudentProfile.bulkCreate([
    {
      userId: 'USR-001',
      branchId: 'br-garegin-8',
      packageId: 'PKG-002',
      instructorUserId: 'INS-001',
      lessonsCompleted: 4,
      lessonsTotal: 18,
      enrollmentStatus: 'active',
      skillRating: 2,
      licenseAchieved: false,
      joinedAt: '2026-03-01',
    },
    {
      userId: 'USR-002',
      branchId: 'br-azatamart-75',
      packageId: 'PKG-001',
      instructorUserId: 'INS-003',
      lessonsCompleted: 10,
      lessonsTotal: 10,
      enrollmentStatus: 'completed',
      skillRating: 0,
      licenseAchieved: true,
      joinedAt: '2026-02-10',
    },
    {
      userId: 'USR-003',
      branchId: 'br-masis-125',
      packageId: 'PKG-003',
      instructorUserId: 'INS-002',
      lessonsCompleted: 2,
      lessonsTotal: 28,
      enrollmentStatus: 'active',
      skillRating: 4,
      licenseAchieved: false,
      joinedAt: '2026-03-15',
    },
    {
      userId: 'USR-004',
      branchId: 'br-garegin-8',
      packageId: 'PKG-002',
      instructorUserId: 'INS-001',
      lessonsCompleted: 0,
      lessonsTotal: 18,
      enrollmentStatus: 'inactive',
      skillRating: 1,
      licenseAchieved: false,
      joinedAt: '2026-01-20',
    },
    {
      userId: 'USR-005',
      branchId: 'br-azatamart-75',
      packageId: 'PKG-001',
      instructorUserId: 'INS-004',
      lessonsCompleted: 6,
      lessonsTotal: 10,
      enrollmentStatus: 'active',
      skillRating: 3,
      licenseAchieved: false,
      joinedAt: '2026-03-20',
    },
    {
      userId: 'USR-006',
      branchId: 'br-masis-125',
      packageId: 'PKG-003',
      instructorUserId: 'INS-003',
      lessonsCompleted: 15,
      lessonsTotal: 28,
      enrollmentStatus: 'active',
      skillRating: 6,
      licenseAchieved: false,
      joinedAt: '2026-02-01',
    },
    {
      userId: 'USR-DEMO',
      branchId: 'br-garegin-8',
      packageId: 'PKG-002',
      instructorUserId: 'INS-001',
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
      id: 'BK-001',
      studentUserId: 'USR-001',
      instructorUserId: 'INS-001',
      branchId: 'br-garegin-8',
      dateIso: '2026-03-28',
      time: '10:00',
      lessonType: 'practical',
      status: 'confirmed',
    },
    {
      id: 'BK-002',
      studentUserId: 'USR-002',
      instructorUserId: 'INS-003',
      branchId: 'br-azatamart-75',
      dateIso: '2026-03-28',
      time: '14:00',
      lessonType: 'practical',
      status: 'confirmed',
    },
    {
      id: 'BK-003',
      studentUserId: 'USR-003',
      instructorUserId: 'INS-002',
      branchId: 'br-masis-125',
      dateIso: '2026-03-29',
      time: '09:00',
      lessonType: 'theory',
      status: 'pending',
    },
    {
      id: 'BK-004',
      studentUserId: 'USR-004',
      instructorUserId: 'INS-001',
      branchId: 'br-garegin-8',
      dateIso: '2026-03-29',
      time: '11:00',
      lessonType: 'practical',
      status: 'cancelled',
    },
    {
      id: 'BK-005',
      studentUserId: 'USR-005',
      instructorUserId: 'INS-003',
      branchId: 'br-azatamart-75',
      dateIso: '2026-03-30',
      time: '16:00',
      lessonType: 'practical',
      status: 'confirmed',
    },
    { id: 'sb-1', studentUserId: 'USR-DEMO', instructorUserId: 'INS-001', branchId: 'br-garegin-8', dateIso: '2026-04-11', time: '10:00', lessonType: 'practical', status: 'confirmed' },
    { id: 'sb-2', studentUserId: 'USR-DEMO', instructorUserId: 'INS-002', branchId: 'br-garegin-8', dateIso: '2026-04-14', time: '14:00', lessonType: 'theory', status: 'confirmed' },
    {
      id: 'sb-3',
      studentUserId: 'USR-DEMO',
      instructorUserId: 'INS-001',
      branchId: 'br-garegin-8',
      dateIso: '2026-08-20',
      time: '09:00',
      lessonType: 'practical',
      status: 'pending_prebook',
    },
    { id: 'sb-4', studentUserId: 'USR-DEMO', instructorUserId: 'INS-001', branchId: 'br-garegin-8', dateIso: '2026-03-22', time: '11:00', lessonType: 'practical', status: 'completed' },
    { id: 'sb-5', studentUserId: 'USR-DEMO', instructorUserId: 'INS-002', branchId: 'br-garegin-8', dateIso: '2026-03-08', time: '16:00', lessonType: 'theory', status: 'completed' },
    { id: 'sb-6', studentUserId: 'USR-DEMO', instructorUserId: 'INS-001', branchId: 'br-garegin-8', dateIso: '2026-02-26', time: '15:00', lessonType: 'practical', status: 'cancelled' },
  ]);

  await TheoryCohort.bulkCreate([
    {
      id: 'COH-012',
      name: 'Theory Cohort 12',
      startDateIso: '2026-03-20',
      endDateIso: '2026-04-10',
      schedule: 'Tue & Thu, 18:00–20:00',
      seats: 12,
      instructorName: 'Narine Hovhannisyan',
      meetLink: 'https://meet.google.com/abc-def',
      status: 'active',
      branchId: 'br-garegin-8',
    },
    {
      id: 'COH-013',
      name: 'Theory Cohort 13',
      startDateIso: '2026-04-15',
      endDateIso: '2026-05-05',
      schedule: 'Mon & Wed, 18:00–20:00',
      seats: 15,
      instructorName: 'Vardan Grigoryan',
      meetLink: 'https://meet.google.com/xyz-123',
      status: 'upcoming',
      branchId: 'br-azatamart-75',
    },
    {
      id: 'COH-011',
      name: 'Theory Cohort 11',
      startDateIso: '2026-02-01',
      endDateIso: '2026-02-21',
      schedule: 'Mon & Wed, 17:00–19:00',
      seats: 12,
      instructorName: 'Narine Hovhannisyan',
      meetLink: '',
      status: 'completed',
      branchId: 'br-masis-125',
    },
  ]);

  await TheoryCohortEnrollment.bulkCreate([
    { cohortId: 'COH-012', studentUserId: 'USR-001' },
    { cohortId: 'COH-012', studentUserId: 'USR-002' },
    { cohortId: 'COH-012', studentUserId: 'USR-003' },
    { cohortId: 'COH-012', studentUserId: 'USR-004' },
    { cohortId: 'COH-012', studentUserId: 'USR-005' },
    { cohortId: 'COH-013', studentUserId: 'USR-001' },
    { cohortId: 'COH-013', studentUserId: 'USR-002' },
    { cohortId: 'COH-013', studentUserId: 'USR-003' },
    { cohortId: 'COH-011', studentUserId: 'USR-001' },
    { cohortId: 'COH-011', studentUserId: 'USR-002' },
    { cohortId: 'COH-011', studentUserId: 'USR-003' },
    { cohortId: 'COH-011', studentUserId: 'USR-004' },
    { cohortId: 'COH-011', studentUserId: 'USR-005' },
    { cohortId: 'COH-011', studentUserId: 'USR-006' },
    { cohortId: 'COH-011', studentUserId: 'USR-DEMO' },
  ]);

  const financeSeedRows = [
      {
        id: 'TX-2026-0412',
        createdAt: new Date('2026-04-06T06:14:00.000Z'),
        customer: 'Ani Karapetyan',
        email: 'ani@example.com',
        description: 'Standard package',
        branchId: 'br-garegin-8',
        channel: 'online',
        method: 'card',
        grossAmd: 55000,
        feeAmd: 1650,
        status: 'completed',
        providerRef: 'ARCA-7F3A-99102',
        source: 'system',
      },
      {
        id: 'TX-2026-0411',
        createdAt: new Date('2026-04-05T12:42:00.000Z'),
        customer: 'Tigran Mkhitaryan',
        email: 'tigran@example.com',
        description: 'Theory course cohort 12',
        branchId: 'br-azatamart-75',
        channel: 'online',
        method: 'idram',
        grossAmd: 8000,
        feeAmd: 200,
        status: 'completed',
        providerRef: 'IDR-4482910',
        source: 'system',
      },
      {
        id: 'TX-2026-0410',
        createdAt: new Date('2026-04-05T07:05:00.000Z'),
        customer: 'Nare Harutyunyan',
        email: 'nare@example.com',
        description: 'Extra lesson (1×)',
        branchId: 'br-masis-125',
        channel: 'pos',
        method: 'card',
        grossAmd: 4000,
        feeAmd: 120,
        status: 'completed',
        providerRef: 'POS-YVN-22041',
        source: 'system',
        bookingId: 'BK-003',
      },
      {
        id: 'TX-2026-0409',
        createdAt: new Date('2026-04-04T05:30:00.000Z'),
        customer: 'Suren Danielyan',
        email: 'suren@example.com',
        description: 'Premium package',
        branchId: 'br-garegin-8',
        channel: 'bank',
        method: 'transfer',
        grossAmd: 72000,
        feeAmd: 0,
        status: 'pending',
        providerRef: 'INB-602884',
        source: 'system',
      },
      {
        id: 'TX-2026-0408',
        createdAt: new Date('2026-04-03T10:18:00.000Z'),
        customer: 'Mane Poghosyan',
        email: 'mane@example.com',
        description: 'Exam fee',
        branchId: 'br-azatamart-75',
        channel: 'online',
        method: 'card',
        grossAmd: 12000,
        feeAmd: 360,
        status: 'failed',
        providerRef: 'ARCA-DECL-88301',
        source: 'system',
      },
      {
        id: 'TX-2026-0407',
        createdAt: new Date('2026-04-02T06:00:00.000Z'),
        customer: 'Artak Sargsyan',
        email: 'artak@example.com',
        description: 'Standard package (refunded)',
        branchId: 'br-masis-125',
        channel: 'online',
        method: 'idram',
        grossAmd: 55000,
        feeAmd: 1375,
        status: 'refunded',
        providerRef: 'IDR-RFD-99102',
        source: 'system',
      },
  ];
  await FinanceTransaction.bulkCreate(financeSeedRows as never[], { validate: true });

  await StudentExtraPractical.create({
    id: 'PL-001',
    userId: 'USR-DEMO',
    practicalTotal: 3,
    practicalUsed: 1,
    purchasedAt: '2026-03-15',
  });

  await Blog.bulkCreate([
    {
      id: 'blog-seed-1',
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
      id: 'blog-seed-2',
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
      id: q.id,
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
    id: 'car-demo-1',
    plate: '00 AA 000',
    make: 'Toyota',
    model: 'Corolla',
    year: 2022,
    transmission: 'manual',
    notes: 'Demo fleet vehicle',
  });
}
