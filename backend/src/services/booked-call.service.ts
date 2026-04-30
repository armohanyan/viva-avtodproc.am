import { BookedCall, type BookedCallStatus } from '../models/booked-call.model';
import NotificationService from './notification.service';

export type BookedCallDto = {
  id: number;
  name: string | null;
  phone: string;
  preferredTimeSlot: string;
  notes: string | null;
  status: BookedCallStatus;
  createdAt: string;
  updatedAt: string;
};

function toDto(row: BookedCall): BookedCallDto {
  const plain = row.toJSON() as Record<string, unknown>;
  const createdRaw = plain.createdAt;
  const updatedRaw = plain.updatedAt;
  const createdAt =
    createdRaw instanceof Date ? createdRaw.toISOString() : new Date(String(createdRaw)).toISOString();
  const updatedAt =
    updatedRaw instanceof Date ? updatedRaw.toISOString() : new Date(String(updatedRaw)).toISOString();
  return {
    id: row.id,
    name: row.name ?? null,
    phone: row.phone,
    preferredTimeSlot: row.preferredTimeSlot,
    notes: row.notes ?? null,
    status: row.status as BookedCallStatus,
    createdAt,
    updatedAt,
  };
}

export default class BookedCallService {
  static async create(input: {
    name?: string | null;
    phone: string;
    preferredTimeSlot: string;
    notes?: string | null;
  }): Promise<BookedCallDto> {
    const row = await BookedCall.create({
      name: input.name?.trim() ? input.name.trim() : null,
      phone: input.phone.trim(),
      preferredTimeSlot: input.preferredTimeSlot.trim(),
      notes: input.notes?.trim() ? input.notes.trim() : null,
      status: 'pending',
    });
    void NotificationService.createForRoles(['admin', 'super_admin'], {
      type: 'CALL_REQUEST_CREATED',
      title: 'Նոր զանգի հարցում',
      message: input.name?.trim() || input.phone.trim(),
      entityType: 'booked_call',
      entityId: String(row.id),
      metadata: { phone: input.phone.trim(), preferredTimeSlot: input.preferredTimeSlot.trim() },
      dedupeKey: `booked-call-created:${row.id}`,
    }).catch(() => {});
    return toDto(row);
  }

  static async listForStaff(): Promise<BookedCallDto[]> {
    const rows = await BookedCall.findAll({ order: [['createdAt', 'DESC']] });
    return rows.map(toDto);
  }

  static async updateStatus(id: number, status: BookedCallStatus): Promise<BookedCallDto | null> {
    const row = await BookedCall.findByPk(id);
    if (!row) return null;
    await row.update({ status });
    return toDto(row);
  }
}
