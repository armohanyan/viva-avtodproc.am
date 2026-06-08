import 'dotenv/config';
import { connectDatabase } from '../database/sequelize';
import BookingCronService from '../services/booking-cron.service';
import LoggerUtil from '../utils/logger.util';

async function main() {
  await connectDatabase();

  const result = await BookingCronService.runDueJobs();

  LoggerUtil.info(
    `run-booking-jobs: ${JSON.stringify({
      ...result,
      lessonReminders: result.upcomingLessonRemindersCreated,
      lessonCompletion: {
        bookingsCompleted: result.bookingsMarkedCompleted,
        bookingsMissed: result.bookingsMarkedMissed,
        cohortSessionsCompleted: result.cohortSessionsMarkedCompleted,
      },
    })}`,
  );
  process.exit(0);
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
