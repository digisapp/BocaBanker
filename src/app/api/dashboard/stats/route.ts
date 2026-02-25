import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { logger } from '@/lib/logger';
import {
  clients,
  properties,
  costSegStudies,
  emailLogs,
} from '@/db/schema';
import { eq, count, sql, desc, gte, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // Date for "this month" calculations
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Total clients
    const [clientCount] = await db
      .select({ total: count() })
      .from(clients)
      .where(eq(clients.userId, userId));

    // New clients this month
    const [newClientsCount] = await db
      .select({ total: count() })
      .from(clients)
      .where(
        and(
          eq(clients.userId, userId),
          gte(clients.createdAt, startOfMonth)
        )
      );

    // Total properties
    const [propertyCount] = await db
      .select({ total: count() })
      .from(properties)
      .where(eq(properties.userId, userId));

    // Total studies and completed
    const [studyCount] = await db
      .select({ total: count() })
      .from(costSegStudies)
      .where(eq(costSegStudies.userId, userId));

    const [completedCount] = await db
      .select({ total: count() })
      .from(costSegStudies)
      .where(
        and(
          eq(costSegStudies.userId, userId),
          eq(costSegStudies.status, 'completed')
        )
      );

    // Total tax savings across all studies
    const [savingsResult] = await db
      .select({
        total: sql<string>`COALESCE(SUM(CAST(${costSegStudies.totalTaxSavings} AS DECIMAL)), 0)`,
      })
      .from(costSegStudies)
      .where(eq(costSegStudies.userId, userId));

    // Emails sent this month
    const [emailCount] = await db
      .select({ total: count() })
      .from(emailLogs)
      .where(
        and(
          eq(emailLogs.userId, userId),
          gte(emailLogs.sentAt, startOfMonth)
        )
      );

    // Recent activity: last 10 created items across tables
    // We simulate activity from recent clients, studies, and emails
    const recentClients = await db
      .select({
        id: clients.id,
        name: sql<string>`${clients.firstName} || ' ' || ${clients.lastName}`,
        createdAt: clients.createdAt,
      })
      .from(clients)
      .where(eq(clients.userId, userId))
      .orderBy(desc(clients.createdAt))
      .limit(5);

    const recentStudies = await db
      .select({
        id: costSegStudies.id,
        name: costSegStudies.studyName,
        status: costSegStudies.status,
        createdAt: costSegStudies.createdAt,
      })
      .from(costSegStudies)
      .where(eq(costSegStudies.userId, userId))
      .orderBy(desc(costSegStudies.createdAt))
      .limit(5);

    const recentEmails = await db
      .select({
        id: emailLogs.id,
        toEmail: emailLogs.toEmail,
        subject: emailLogs.subject,
        sentAt: emailLogs.sentAt,
      })
      .from(emailLogs)
      .where(eq(emailLogs.userId, userId))
      .orderBy(desc(emailLogs.sentAt))
      .limit(5);

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
      totalClients: clientCount?.total || 0,
      newClientsThisMonth: newClientsCount?.total || 0,
      totalProperties: propertyCount?.total || 0,
      totalStudies: studyCount?.total || 0,
      completedStudies: completedCount?.total || 0,
      totalTaxSavings: parseFloat(savingsResult?.total || '0'),
      emailsSentThisMonth: emailCount?.total || 0,
      recentActivity,
    });
  } catch (error) {
    logger.error('dashboard-api', 'Dashboard stats error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
