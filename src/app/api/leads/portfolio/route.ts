import { NextResponse } from 'next/server';
import { requireAuth, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { db } from '@/db';
import { leads } from '@/db/schema';
import { isNotNull } from 'drizzle-orm';
import { logger } from '@/lib/logger';

interface PortfolioMember {
  memberName: string;
  memberAddress: string | null;
  memberCity: string | null;
  memberState: string | null;
  memberZip: string | null;
  propertyCount: number;
  totalValue: number;
  latestPurchase: string | null;
  cities: string[];
  properties: {
    id: string;
    propertyAddress: string | null;
    propertyCity: string | null;
    salePrice: string | null;
    saleDate: string | null;
    buyerName: string | null;
    propertyType: string | null;
    status: string | null;
  }[];
}

export async function GET() {
  try {
    await requireAuth();

    // Fetch all leads that have a member_name
    const rows = await db
      .select({
        id: leads.id,
        memberName: leads.memberName,
        memberAddress: leads.memberAddress,
        memberCity: leads.memberCity,
        memberState: leads.memberState,
        memberZip: leads.memberZip,
        propertyAddress: leads.propertyAddress,
        propertyCity: leads.propertyCity,
        salePrice: leads.salePrice,
        saleDate: leads.saleDate,
        buyerName: leads.buyerName,
        propertyType: leads.propertyType,
        status: leads.status,
      })
      .from(leads)
      .where(isNotNull(leads.memberName));

    // Group by member_name
    const memberMap = new Map<string, PortfolioMember>();

    for (const r of rows) {
      const name = r.memberName as string;
      const existing = memberMap.get(name);

      const property = {
        id: r.id,
        propertyAddress: r.propertyAddress,
        propertyCity: r.propertyCity,
        salePrice: r.salePrice,
        saleDate: r.saleDate,
        buyerName: r.buyerName,
        propertyType: r.propertyType,
        status: r.status,
      };

      const price = r.salePrice ? parseFloat(r.salePrice) : 0;

      if (existing) {
        existing.propertyCount++;
        existing.totalValue += isNaN(price) ? 0 : price;
        existing.properties.push(property);
        if (r.saleDate && (!existing.latestPurchase || r.saleDate > existing.latestPurchase)) {
          existing.latestPurchase = r.saleDate;
        }
        if (r.propertyCity && !existing.cities.includes(r.propertyCity)) {
          existing.cities.push(r.propertyCity);
        }
      } else {
        memberMap.set(name, {
          memberName: name,
          memberAddress: r.memberAddress,
          memberCity: r.memberCity,
          memberState: r.memberState,
          memberZip: r.memberZip,
          propertyCount: 1,
          totalValue: isNaN(price) ? 0 : price,
          latestPurchase: r.saleDate,
          cities: r.propertyCity ? [r.propertyCity] : [],
          properties: [property],
        });
      }
    }

    // Convert to array and sort by property count descending, then total value
    const portfolios = Array.from(memberMap.values())
      .sort((a, b) => b.propertyCount - a.propertyCount || b.totalValue - a.totalValue);

    const multiPropertyCount = portfolios.filter(p => p.propertyCount > 1).length;
    const totalPortfolioValue = portfolios.reduce((sum, p) => sum + p.totalValue, 0);

    return NextResponse.json({
      portfolios,
      stats: {
        totalMembers: portfolios.length,
        multiPropertyOwners: multiPropertyCount,
        avgProperties: portfolios.length > 0
          ? +(portfolios.reduce((sum, p) => sum + p.propertyCount, 0) / portfolios.length).toFixed(1)
          : 0,
        totalValue: totalPortfolioValue,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('portfolio-api', 'GET /api/leads/portfolio error', error);
    return apiError('Failed to fetch portfolio data');
  }
}
