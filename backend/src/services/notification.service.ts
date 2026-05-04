import { Op, type FindOptions, type Transaction } from 'sequelize';
import { Booking, Notification, User } from '../models';
import type { NotificationEntityType, NotificationType } from '../models/notification.model';
import type { AccountType } from '../models/user.model';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { InputValidationError } = ErrorsUtil;

export type NotificationDto = {
  id: number;
  recipientUserId: number;
  recipientRole: AccountType;
  type: NotificationType;
  title: string;
  message: string;
  entityType: NotificationEntityType;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotificationListParams = {
  userId: number;
  page?: number;
  pageSize?: number;
  isRead?: boolean;
  type?: NotificationType;
  createdFrom?: string;
  createdTo?: string;
};

type CreateNotificationInput = {
  recipientUserId: number;
  recipientRole: AccountType;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: NotificationEntityType;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  dedupeKey?: string | null;
};

function toDto(row: Notification): NotificationDto {
  const plain = row.toJSON() as Record<string, unknown>;
  const createdAt = plain.createdAt instanceof Date ? plain.createdAt.toISOString() : new Date(String(plain.createdAt)).toISOString();
  const updatedAt = plain.updatedAt instanceof Date ? plain.updatedAt.toISOString() : new Date(String(plain.updatedAt)).toISOString();
  const readAt = plain.readAt instanceof Date ? plain.readAt.toISOString() : plain.readAt ? new Date(String(plain.readAt)).toISOString() : null;
  return {
    id: row.id,
    recipientUserId: row.recipientUserId,
    recipientRole: row.recipientRole,
    type: row.type,
    title: row.title,
    message: row.message,
    entityType: row.entityType,
    entityId: row.entityId ?? null,
    metadata: row.metadata ?? null,
    isRead: Boolean(row.isRead),
    readAt,
    createdAt,
    updatedAt,
  };
}

export default class NotificationService {
  static async createOne(input: CreateNotificationInput, transaction?: Transaction): Promise<NotificationDto | null> {
    const row = await Notification.create(
      {
        recipientUserId: input.recipientUserId,
        recipientRole: input.recipientRole,
        type: input.type,
        title: input.title.trim(),
        message: input.message.trim(),
        entityType: input.entityType ?? 'system',
        entityId: input.entityId?.trim() ? input.entityId.trim() : null,
        metadata: input.metadata ?? null,
        dedupeKey: input.dedupeKey?.trim() ? input.dedupeKey.trim() : null,
      },
      { transaction },
    ).catch((e) => {
      if (String((e as { name?: string }).name) === 'SequelizeUniqueConstraintError') {
        return null;
      }
      throw e;
    });
    if (!row) return null;
    return toDto(row);
  }

  static async createMany(inputs: CreateNotificationInput[], transaction?: Transaction): Promise<number> {
    if (inputs.length === 0) return 0;
    const rows = inputs.map((i) => ({
      recipientUserId: i.recipientUserId,
      recipientRole: i.recipientRole,
      type: i.type,
      title: i.title.trim(),
      message: i.message.trim(),
      entityType: i.entityType ?? 'system',
      entityId: i.entityId?.trim() ? i.entityId.trim() : null,
      metadata: i.metadata ?? null,
      dedupeKey: i.dedupeKey?.trim() ? i.dedupeKey.trim() : null,
    }));
    await Notification.bulkCreate(rows, { transaction, ignoreDuplicates: true });
    return rows.length;
  }

  static async createForRoles(
    roles: AccountType[],
    payload: Omit<CreateNotificationInput, 'recipientUserId' | 'recipientRole'>,
    transaction?: Transaction,
  ): Promise<number> {
    if (roles.length === 0) return 0;
    const users = await User.findAll({
      where: { accountType: { [Op.in]: roles }, isActive: true },
      attributes: ['id', 'accountType'],
      transaction,
    });
    return this.createMany(
      users.map((u) => ({
        ...payload,
        recipientUserId: u.id,
        recipientRole: u.accountType,
        dedupeKey: payload.dedupeKey ? `${payload.dedupeKey}:u${u.id}` : null,
      })),
      transaction,
    );
  }

  static async listForUser(params: NotificationListParams): Promise<{
    items: NotificationDto[];
    page: number;
    pageSize: number;
    total: number;
  }> {
    const page = Number.isFinite(params.page) ? Math.max(1, Number(params.page)) : 1;
    const pageSize = Number.isFinite(params.pageSize) ? Math.min(100, Math.max(1, Number(params.pageSize))) : 20;
    const where: FindOptions['where'] = { recipientUserId: params.userId };
    if (typeof params.isRead === 'boolean') {
      (where as Record<string, unknown>).isRead = params.isRead;
    }
    if (params.type) {
      (where as Record<string, unknown>).type = params.type;
    }
    if (params.createdFrom || params.createdTo) {
      const dateWhere: Record<string, Date> = {};
      if (params.createdFrom) dateWhere[Op.gte as unknown as string] = new Date(params.createdFrom);
      if (params.createdTo) dateWhere[Op.lte as unknown as string] = new Date(params.createdTo);
      (where as Record<string, unknown>).createdAt = dateWhere;
    }
    const { rows, count } = await Notification.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      offset: (page - 1) * pageSize,
      limit: pageSize,
    });
    return {
      items: rows.map(toDto),
      page,
      pageSize,
      total: count,
    };
  }

  static async unreadCount(userId: number): Promise<number> {
    return Notification.count({ where: { recipientUserId: userId, isRead: false } });
  }

  static async markRead(userId: number, id: number): Promise<NotificationDto> {
    const row = await Notification.findOne({ where: { id, recipientUserId: userId } });
    if (!row) {
      throw new InputValidationError('Notification not found', HttpStatusCodesUtil.NOT_FOUND);
    }
    if (!row.isRead) {
      await row.update({ isRead: true, readAt: new Date() });
    }
    return toDto(row);
  }

  static async markAllRead(userId: number): Promise<{ updated: number }> {
    const [updated] = await Notification.update(
      { isRead: true, readAt: new Date() },
      { where: { recipientUserId: userId, isRead: false } },
    );
    return { updated };
  }

  static async remove(userId: number, id: number): Promise<{ ok: true }> {
    const deleted = await Notification.destroy({ where: { id, recipientUserId: userId } });
    if (deleted === 0) {
      throw new InputValidationError('Notification not found', HttpStatusCodesUtil.NOT_FOUND);
    }
    return { ok: true as const };
  }

  static async emitUpcomingLessonReminders(now = new Date()): Promise<number> {
    const from = now.getTime();
    const reminderWindows = [
      { label: '24h', targetMs: from + 24 * 3600_000, toleranceMs: 15 * 60_000 },
      { label: '2h', targetMs: from + 2 * 3600_000, toleranceMs: 15 * 60_000 },
    ];
    let created = 0;
    const bookingRows = await Booking.findAll({
      where: { status: { [Op.in]: ['pending', 'confirmed'] } },
      attributes: ['id', 'studentUserId', 'instructorUserId', 'dateIso', 'time', 'lessonType'],
    });
    for (const b of bookingRows) {
      const t = String(b.time).slice(0, 5);
      const startMs = Date.parse(`${String(b.dateIso).slice(0, 10)}T${t}:00+04:00`);
      if (!Number.isFinite(startMs)) continue;
      for (const window of reminderWindows) {
        const diff = Math.abs(startMs - window.targetMs);
        if (diff > window.toleranceMs) continue;
        const title = 'Դասի հիշեցում';
        const message = window.label === '24h' ? 'Ձեր դասը մոտենում է (24 ժամից)' : 'Ձեր դասը մոտենում է (2 ժամից)';
        const batch: CreateNotificationInput[] = [
          {
            recipientUserId: b.studentUserId,
            recipientRole: 'student',
            type: 'LESSON_UPCOMING',
            title,
            message,
            entityType: 'booking',
            entityId: String(b.id),
            metadata: { reminderType: window.label },
            dedupeKey: `lesson-reminder:${b.id}:${window.label}:student:${b.studentUserId}`,
          },
        ];
        if (b.instructorUserId != null) {
          batch.push({
            recipientUserId: b.instructorUserId,
            recipientRole: 'instructor',
            type: 'LESSON_UPCOMING',
            title,
            message,
            entityType: 'booking',
            entityId: String(b.id),
            metadata: { reminderType: window.label },
            dedupeKey: `lesson-reminder:${b.id}:${window.label}:instructor:${b.instructorUserId}`,
          });
        }
        created += await this.createMany(batch);
      }
    }
    return created;
  }
}
