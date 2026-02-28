import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { leads } from '@/db/schema';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';

// Property type mapping for ATTOM API
const ATTOM_PROPERTY_TYPE_MAP: Record<string, string> = {
  industrial: 'INDUSTRIAL',
  office: 'OFFICE BUILDING',
};

// Florida county property appraiser sites
const COUNTY_SOURCES = [
  {
    name: 'Palm Beach',
    searchUrl: 'https://www.pbcpao.gov/sales-search',
    bulkDataUrl: 'https://www.pbcpao.gov/data-downloads',
    instructions:
      'Visit the Sales Search page and filter by date range and property type. ' +
      'Use the Data Downloads page for bulk CSV exports of recent sales. ' +
      'Select "Sales" from the available datasets and apply your desired filters.',
  },
  {
    name: 'Broward',
    searchUrl: 'https://www.bcpa.net/RecSales.asp',
    bulkDataUrl: 'https://www.bcpa.net/DataDownloads.asp',
    instructions:
      'Navigate to the Recorded Sales page to search by date and property type. ' +
      'Broward County also provides bulk data downloads in CSV format from the Data Downloads page. ' +
      'Filter by "Commercial" or specific property use codes for industrial/office properties.',
  },
  {
    name: 'Miami-Dade',
    searchUrl: 'https://www.miamidade.gov/pa/property-search.asp',
    bulkDataUrl: null,
    instructions:
      'Use the Property Search page to look up recent sales. ' +
      'Miami-Dade does not offer direct bulk CSV downloads from the property appraiser site. ' +
      'Consider using the Clerk of Courts records for deed transfers or request bulk data via public records request.',
  },
  {
    name: 'Orange',
    searchUrl: 'https://www.ocpafl.org/Searches/SalesSearch.aspx',
    bulkDataUrl: 'https://www.ocpafl.org/Downloads/DataDownloads.aspx',
    instructions:
      'Use the Sales Search to filter by sale date range and property type. ' +
      'Orange County offers data downloads including sales files in CSV format from the Data Downloads page.',
  },
  {
    name: 'Hillsborough',
    searchUrl: 'https://www.hcpafl.org/Property-Info/Property-Search',
    bulkDataUrl: 'https://www.hcpafl.org/Property-Info/Data-Downloads',
    instructions:
      'Search for properties and filter by sales data on the Property Search page. ' +
      'Hillsborough County provides bulk data downloads including qualified sales files from the Data Downloads page.',
  },
  {
    name: 'Duval',
    searchUrl: 'https://www.duvalpa.com/sales-search',
    bulkDataUrl: null,
    instructions:
      'Use the Sales Search to find recent commercial property sales by date range. ' +
      'Duval County does not provide bulk CSV downloads. ' +
      'You may need to export results manually or submit a public records request for bulk data.',
  },
];

// Expected CSV column headers for county data import
const CSV_FORMAT = [
  'property_address',
  'property_city',
  'property_county',
  'property_state',
  'property_zip',
  'property_type',
  'sale_price',
  'sale_date',
  'parcel_id',
  'deed_book_page',
  'buyer_name',
  'buyer_company',
  'seller_name',
  'square_footage',
  'year_built',
  'building_value',
  'land_value',
];

interface ScrapeRequestBody {
  source: 'attom' | 'county';
  attomApiKey?: string;
  state?: string;
  propertyTypes?: string[];
  minPrice?: number;
  maxPrice?: number;
  dateFrom?: string;
  dateTo?: string;
  counties?: string[];
}

interface AttomSaleRecord {
  address?: {
    line1?: string;
    line2?: string;
    locality?: string;
    countrySubd?: string;
    postal1?: string;
    oneLine?: string;
  };
  area?: {
    countyFIPS?: string;
    countyName?: string;
    munName?: string;
  };
  identifier?: {
    apn?: string;
  };
  lot?: {
    lotSize1?: number;
  };
  building?: {
    size?: {
      bldgSize?: number;
      grossSize?: number;
    };
    summary?: {
      yearBuilt?: number;
    };
  };
  sale?: {
    saleTransDate?: string;
    amount?: {
      saleAmt?: number;
    };
    calculation?: {
      pricePerBed?: number;
    };
  };
  assessment?: {
    assessed?: {
      assdImprValue?: number;
      assdLandValue?: number;
    };
  };
  summary?: {
    propType?: string;
    propSubType?: string;
  };
  vintage?: Record<string, unknown>;
}

function mapAttomPropertyType(
  propType?: string,
  propSubType?: string
): 'industrial' | 'office' | 'retail' | 'multifamily' | 'mixed-use' | 'hospitality' | 'healthcare' | 'other' {
  const type = (propType || '').toUpperCase();
  const subType = (propSubType || '').toUpperCase();

  if (type.includes('INDUSTRIAL') || subType.includes('INDUSTRIAL')) return 'industrial';
  if (type.includes('OFFICE') || subType.includes('OFFICE')) return 'office';
  if (type.includes('RETAIL') || subType.includes('RETAIL')) return 'retail';
  if (type.includes('MULTI') || subType.includes('MULTI') || subType.includes('APARTMENT')) return 'multifamily';
  if (type.includes('MIXED') || subType.includes('MIXED')) return 'mixed-use';
  if (type.includes('HOTEL') || type.includes('HOSPITALITY') || subType.includes('HOTEL')) return 'hospitality';
  if (type.includes('HEALTH') || type.includes('MEDICAL') || subType.includes('MEDICAL')) return 'healthcare';
  return 'other';
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const [dbUser] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!dbUser || dbUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: admin access required' },
        { status: 403 }
      );
    }

    const body: ScrapeRequestBody = await request.json();
    const { source } = body;

    if (!source || (source !== 'attom' && source !== 'county')) {
      return NextResponse.json(
        { error: 'Invalid source. Must be "attom" or "county".' },
        { status: 400 }
      );
    }

    // -----------------------------------------------------------------------
    // Source: ATTOM Property API
    // -----------------------------------------------------------------------
    if (source === 'attom') {
      const {
        attomApiKey,
        state = 'FL',
        propertyTypes = [],
        minPrice,
        maxPrice,
        dateFrom,
        dateTo,
      } = body;

      if (!attomApiKey) {
        return NextResponse.json(
          { error: 'attomApiKey is required for ATTOM source' },
          { status: 400 }
        );
      }

      // Build ATTOM property type filter
      const attomPropertyTypes = propertyTypes
        .map((pt) => ATTOM_PROPERTY_TYPE_MAP[pt])
        .filter(Boolean);

      let totalImported = 0;
      const maxPages = 10;
      const pageSize = 100;

      for (let page = 1; page <= maxPages; page++) {
        try {
          // Build query params
          const params = new URLSearchParams();

          // Florida FIPS code
          const stateFips = state === 'FL' ? 'ST12' : `ST${state}`;
          params.set('geoid', stateFips);
          params.set('page', page.toString());
          params.set('pagesize', pageSize.toString());

          if (minPrice !== undefined) {
            params.set('minsaleamt', minPrice.toString());
          }
          if (maxPrice !== undefined) {
            params.set('maxsaleamt', maxPrice.toString());
          }
          if (dateFrom) {
            params.set('minsaledate', dateFrom);
          }
          if (dateTo) {
            params.set('maxsaledate', dateTo);
          }
          if (attomPropertyTypes.length > 0) {
            params.set('propertytype', attomPropertyTypes.join(','));
          }

          const url = `https://api.gateway.attomdata.com/propertyapi/v1.0.0/sale/snapshot?${params.toString()}`;

          logger.info('leads-scrape', `Fetching ATTOM page ${page}`, { url });

          const response = await fetch(url, {
            headers: {
              apikey: attomApiKey,
              Accept: 'application/json',
            },
          });

          if (!response.ok) {
            const errorText = await response.text();
            logger.error('leads-scrape', `ATTOM API error on page ${page}`, {
              status: response.status,
              body: errorText,
            });

            // If first page fails, return error to user
            if (page === 1) {
              return NextResponse.json(
                {
                  error: `ATTOM API error: ${response.status} ${response.statusText}`,
                  details: errorText,
                },
                { status: 502 }
              );
            }

            // On subsequent pages, stop pagination (likely reached the end)
            break;
          }

          const data = await response.json();
          const records: AttomSaleRecord[] =
            data?.property || data?.sale?.property || [];

          if (records.length === 0) {
            logger.info('leads-scrape', `No more records on page ${page}, stopping pagination`);
            break;
          }

          // Map ATTOM records to leads table format
          const leadsToInsert = records
            .map((record) => {
              const address =
                record.address?.oneLine ||
                record.address?.line1 ||
                '';

              if (!address) return null;

              const mappedType = mapAttomPropertyType(
                record.summary?.propType,
                record.summary?.propSubType
              );

              return {
                userId: user.id,
                propertyAddress: address,
                propertyCity: record.address?.locality || null,
                propertyCounty: record.area?.countyName || null,
                propertyState: record.address?.countrySubd || 'FL',
                propertyZip: record.address?.postal1 || null,
                propertyType: mappedType,
                salePrice: record.sale?.amount?.saleAmt?.toString() || null,
                saleDate: record.sale?.saleTransDate || null,
                parcelId: record.identifier?.apn || null,
                squareFootage:
                  record.building?.size?.bldgSize ||
                  record.building?.size?.grossSize ||
                  null,
                yearBuilt: record.building?.summary?.yearBuilt || null,
                buildingValue:
                  record.assessment?.assessed?.assdImprValue?.toString() || null,
                landValue:
                  record.assessment?.assessed?.assdLandValue?.toString() || null,
                status: 'new' as const,
                priority: 'medium' as const,
                source: 'attom',
                tags: [] as string[],
              };
            })
            .filter(
              (lead): lead is NonNullable<typeof lead> => lead !== null
            );

          if (leadsToInsert.length > 0) {
            await db.insert(leads).values(leadsToInsert);
            totalImported += leadsToInsert.length;

            logger.info('leads-scrape', `Imported ${leadsToInsert.length} leads from page ${page}`);
          }

          // If fewer records than page size, we've reached the last page
          if (records.length < pageSize) {
            break;
          }
        } catch (pageError) {
          logger.error('leads-scrape', `Error fetching ATTOM page ${page}`, pageError);

          // If first page errors, propagate. Otherwise stop gracefully.
          if (page === 1) {
            throw pageError;
          }
          break;
        }
      }

      logger.info('leads-scrape', `ATTOM import complete`, { totalImported });

      return NextResponse.json({
        imported: totalImported,
        source: 'attom',
      });
    }

    // -----------------------------------------------------------------------
    // Source: County property appraiser sites
    // -----------------------------------------------------------------------
    if (source === 'county') {
      const { counties } = body;

      let filteredCounties = COUNTY_SOURCES;

      if (counties && counties.length > 0) {
        const normalizedFilter = counties.map((c) => c.toLowerCase().trim());
        filteredCounties = COUNTY_SOURCES.filter((cs) =>
          normalizedFilter.includes(cs.name.toLowerCase())
        );
      }

      if (filteredCounties.length === 0) {
        return NextResponse.json(
          {
            error: 'No matching counties found. Supported counties: ' +
              COUNTY_SOURCES.map((c) => c.name).join(', '),
          },
          { status: 400 }
        );
      }

      logger.info('leads-scrape', 'Returning county scrape instructions', {
        counties: filteredCounties.map((c) => c.name),
      });

      return NextResponse.json({
        counties: filteredCounties.map((county) => ({
          name: county.name,
          searchUrl: county.searchUrl,
          bulkDataUrl: county.bulkDataUrl,
          instructions: county.instructions,
        })),
        csvFormat: CSV_FORMAT,
      });
    }

    return NextResponse.json({ error: 'Invalid source' }, { status: 400 });
  } catch (error) {
    logger.error('leads-scrape', 'POST /api/leads/scrape error', error);
    return NextResponse.json(
      { error: 'Failed to process scrape request' },
      { status: 500 }
    );
  }
}
