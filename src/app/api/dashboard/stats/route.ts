import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { db } from '@/db';
import { logger } from '@/lib/logger';
import {
  clients,
  properties,
  costSegStudies,
  emailLogs,
  leads,
} from '@/db/schema';
import { eq, count, sql, desc, gte, and } from 'drizzle-orm';

export async function GET(_request: NextRequest) {
  try {
    const user = await requireAuth();

    const userId = user.id;

    // Date for "this month" calculations
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // One aggregate query per table (COUNT ... FILTER) instead of 17
    // sequential round-trips, all issued in parallel.
    const [
      [clientAgg],
      [propertyAgg],
      [studyAgg],
      [emailAgg],
      [leadAgg],
      recentClients,
      recentStudies,
      recentEmails,
    ] = await Promise.all([
      db
        .select({
          total: count(),
          newThisMonth: sql<number>`count(*) filter (where ${gte(clients.createdAt, startOfMonth)})`.mapWith(Number),
        })
        .from(clients)
        .where(eq(clients.userId, userId)),
      db
        .select({
          total: count(),
          portfolioValue: sql<string>`COALESCE(SUM(${properties.purchasePrice}), 0)`,
        })
        .from(properties)
        .where(eq(properties.userId, userId)),
      db
        .select({
          total: count(),
          completed: sql<number>`count(*) filter (where ${costSegStudies.status} = 'completed')`.mapWith(Number),
          taxSavings: sql<string>`COALESCE(SUM(${costSegStudies.totalTaxSavings}), 0)`,
        })
        .from(costSegStudies)
        .where(eq(costSegStudies.userId, userId)),
      db
        .select({ total: count() })
        .from(emailLogs)
        .where(and(eq(emailLogs.userId, userId), gte(emailLogs.sentAt, startOfMonth))),
      db
        .select({
          total: count(),
          newLeads: sql<number>`count(*) filter (where ${leads.status} = 'new')`.mapWith(Number),
          contacted: sql<number>`count(*) filter (where ${leads.status} = 'contacted')`.mapWith(Number),
          qualified: sql<number>`count(*) filter (where ${leads.status} = 'qualified')`.mapWith(Number),
          converted: sql<number>`count(*) filter (where ${leads.status} = 'converted')`.mapWith(Number),
          newThisMonth: sql<number>`count(*) filter (where ${gte(leads.createdAt, startOfMonth)})`.mapWith(Number),
        })
        .from(leads)
        .where(eq(leads.userId, userId)),
      // Recent activity: last created items across tables
      db
        .select({
          id: clients.id,
          name: sql<string>`${clients.firstName} || ' ' || ${clients.lastName}`,
          createdAt: clients.createdAt,
        })
        .from(clients)
        .where(eq(clients.userId, userId))
        .orderBy(desc(clients.createdAt))
        .limit(5),
      db
        .select({
          id: costSegStudies.id,
          name: costSegStudies.studyName,
          status: costSegStudies.status,
          createdAt: costSegStudies.createdAt,
        })
        .from(costSegStudies)
        .where(eq(costSegStudies.userId, userId))
        .orderBy(desc(costSegStudies.createdAt))
        .limit(5),
      db
        .select({
          id: emailLogs.id,
          toEmail: emailLogs.toEmail,
          subject: emailLogs.subject,
          sentAt: emailLogs.sentAt,
        })
        .from(emailLogs)
        .where(eq(emailLogs.userId, userId))
        .orderBy(desc(emailLogs.sentAt))
        .limit(5),
    ]);

    // Combine and sort by date
    const recentActivity = [
      ...recentClients.map((c) => ({
        id: c.id,
        type: 'client' as const,
        description: `Added client: ${c.name}`,
        timestamp: c.createdAt?.toISOString() || new Date().toISOString(),
      })),
      ...recentStudies.map((s) => ({
        id: s.id,
        type: 'study' as const,
        description: `${s.status === 'completed' ? 'Completed' : 'Created'} study: ${s.name}`,
        timestamp: s.createdAt?.toISOString() || new Date().toISOString(),
      })),
      ...recentEmails.map((e) => ({
        id: e.id,
        type: 'email' as const,
        description: `Sent email to ${e.toEmail}: ${e.subject}`,
        timestamp: e.sentAt?.toISOString() || new Date().toISOString(),
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, 10);

    return NextResponse.json({
      totalClients: clientAgg?.total || 0,
      newClientsThisMonth: clientAgg?.newThisMonth || 0,
      totalProperties: propertyAgg?.total || 0,
      totalStudies: studyAgg?.total || 0,
      completedStudies: studyAgg?.completed || 0,
      totalTaxSavings: parseFloat(studyAgg?.taxSavings || '0'),
      emailsSentThisMonth: emailAgg?.total || 0,
      totalLeads: leadAgg?.total || 0,
      newLeads: leadAgg?.newLeads || 0,
      contactedLeads: leadAgg?.contacted || 0,
      qualifiedLeads: leadAgg?.qualified || 0,
      convertedLeads: leadAgg?.converted || 0,
      newLeadsThisMonth: leadAgg?.newThisMonth || 0,
      totalPortfolioValue: parseFloat(propertyAgg?.portfolioValue || '0'),
      recentActivity,
    });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('dashboard-api', 'Dashboard stats error', error);
    return apiError('Internal server error');
  }
}
