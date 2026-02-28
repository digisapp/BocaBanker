import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
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
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all leads that have a member_name
    const { data: rows, error } = await supabaseAdmin
      .from('leads')
      .select('id, member_name, member_address, member_city, member_state, member_zip, property_address, property_city, sale_price, sale_date, buyer_name, property_type, status')
      .not('member_name', 'is', null);

    if (error) {
      logger.error('portfolio-api', 'Supabase query error', error);
      return NextResponse.json({ error: 'Failed to fetch portfolio data' }, { status: 500 });
    }

    // Group by member_name
    const memberMap = new Map<string, PortfolioMember>();

    for (const r of rows || []) {
      const name = r.member_name as string;
      const existing = memberMap.get(name);

      const property = {
        id: r.id as string,
        propertyAddress: r.property_address as string | null,
        propertyCity: r.property_city as string | null,
        salePrice: r.sale_price as string | null,
        saleDate: r.sale_date as string | null,
        buyerName: r.buyer_name as string | null,
        propertyType: r.property_type as string | null,
        status: r.status as string | null,
      };

      const price = r.sale_price ? parseFloat(r.sale_price as string) : 0;

      if (existing) {
        existing.propertyCount++;
        existing.totalValue += isNaN(price) ? 0 : price;
        existing.properties.push(property);
        if (r.sale_date && (!existing.latestPurchase || r.sale_date > existing.latestPurchase)) {
          existing.latestPurchase = r.sale_date as string;
        }
        if (r.property_city && !existing.cities.includes(r.property_city as string)) {
          existing.cities.push(r.property_city as string);
        }
      } else {
        memberMap.set(name, {
          memberName: name,
          memberAddress: r.member_address as string | null,
          memberCity: r.member_city as string | null,
          memberState: r.member_state as string | null,
          memberZip: r.member_zip as string | null,
          propertyCount: 1,
          totalValue: isNaN(price) ? 0 : price,
          latestPurchase: r.sale_date as string | null,
          cities: r.property_city ? [r.property_city as string] : [],
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
    logger.error('portfolio-api', 'GET /api/leads/portfolio error', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolio data' },
      { status: 500 }
    );
  }
}
