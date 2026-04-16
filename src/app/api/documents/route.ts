import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { db } from '@/db';
import { documents, clients } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '@/lib/logger';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/csv',
  'text/plain',
];

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const clientId = request.nextUrl.searchParams.get('clientId');
    const studyId = request.nextUrl.searchParams.get('studyId');

    const conditions = [eq(documents.userId, user.id)];
    if (clientId) conditions.push(eq(documents.clientId, clientId));
    if (studyId) conditions.push(eq(documents.studyId, studyId));

    const rows = await db
      .select({
        id: documents.id,
        fileName: documents.fileName,
        fileType: documents.fileType,
        fileSize: documents.fileSize,
        storagePath: documents.storagePath,
        clientId: documents.clientId,
        studyId: documents.studyId,
        createdAt: documents.createdAt,
        clientFirstName: clients.firstName,
        clientLastName: clients.lastName,
      })
      .from(documents)
      .leftJoin(clients, eq(documents.clientId, clients.id))
      .where(and(...conditions))
      .orderBy(desc(documents.createdAt));

    const result = rows.map(({ clientFirstName, clientLastName, ...rest }) => ({
      ...rest,
      clientName: clientFirstName
        ? `${clientFirstName} ${clientLastName ?? ''}`.trim()
        : null,
    }));

    return NextResponse.json({ documents: result });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('documents-api', 'GET /api/documents error', error);
    return apiError('Failed to fetch documents');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    const { fileName, fileType, fileSize, storagePath, clientId, studyId } = body;

    if (!fileName || !storagePath) {
      return apiError('fileName and storagePath are required', 400);
    }

    // Validate file type and size
    if (fileType && !ALLOWED_TYPES.includes(fileType)) {
      return apiError('File type not allowed', 400);
    }

    if (fileSize && fileSize > MAX_FILE_SIZE) {
      return apiError('File exceeds 50 MB limit', 400);
    }

    // Verify storagePath belongs to this user (must start with their userId)
    if (!storagePath.startsWith(`${user.id}/`)) {
      return apiError('Invalid storage path', 403);
    }

    const [created] = await db
      .insert(documents)
      .values({
        userId: user.id,
        clientId: clientId || null,
        studyId: studyId || null,
        fileName,
        fileType: fileType || null,
        fileSize: fileSize || null,
        storagePath,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('documents-api', 'POST /api/documents error', error);
    return apiError('Failed to save document record');
  }
}
