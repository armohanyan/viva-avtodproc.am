import { ContactRequest, type ContactRequestStatus } from '../models/contact-request.model';
import NotificationService from './notification.service';

export type ContactRequestDto = {
  id: number;
  firstName: string;
  lastName: string | null;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  status: ContactRequestStatus;
  createdAt: string;
  updatedAt: string;
};

function toDto(row: ContactRequest): ContactRequestDto {
  const plain = row.toJSON() as Record<string, unknown>;
  const createdRaw = plain.createdAt;
  const updatedRaw = plain.updatedAt;
  const createdAt =
    createdRaw instanceof Date ? createdRaw.toISOString() : new Date(String(createdRaw)).toISOString();
  const updatedAt =
    updatedRaw instanceof Date ? updatedRaw.toISOString() : new Date(String(updatedRaw)).toISOString();
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName ?? null,
    email: row.email,
    phone: row.phone ?? null,
    subject: row.subject ?? null,
    message: row.message,
    status: row.status as ContactRequestStatus,
    createdAt,
    updatedAt,
  };
}

export default class ContactRequestService {
  static async create(input: {
    firstName: string;
    lastName?: string | null;
    email: string;
    phone?: string | null;
    subject?: string | null;
    message: string;
  }): Promise<ContactRequestDto> {
    const row = await ContactRequest.create({
      firstName: input.firstName.trim(),
      lastName: input.lastName?.trim() ? input.lastName.trim() : null,
      email: input.email.trim(),
      phone: input.phone?.trim() ? input.phone.trim() : null,
      subject: input.subject?.trim() ? input.subject.trim() : null,
      message: input.message.trim(),
      status: 'active',
    });
    void NotificationService.createForRoles(['admin', 'super_admin'], {
      type: 'CONTACT_REQUEST_CREATED',
      title: 'Նոր կապի հարցում',
      message: `${input.firstName.trim()} ${input.lastName?.trim() ?? ''}`.trim() || input.email.trim(),
      entityType: 'contact_request',
      entityId: String(row.id),
      metadata: { email: input.email.trim(), phone: input.phone?.trim() ?? null },
      dedupeKey: `contact-request-created:${row.id}`,
    }).catch(() => {});
    return toDto(row);
  }

  static async listForStaff(): Promise<ContactRequestDto[]> {
    const rows = await ContactRequest.findAll({ order: [['createdAt', 'DESC']] });
    return rows.map(toDto);
  }

  static async updateStatus(id: number, status: ContactRequestStatus): Promise<ContactRequestDto | null> {
    const row = await ContactRequest.findByPk(id);
    if (!row) return null;
    await row.update({ status });
    return toDto(row);
  }
}
