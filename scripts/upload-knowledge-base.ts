#!/usr/bin/env npx tsx
/**
 * Upload knowledge base documents to the xAI collection for RAG retrieval.
 * Each document covers a specific topic that Boca Banker needs
 * to give accurate, personalized answers beyond the system prompt.
 *
 * Usage: npx tsx scripts/upload-knowledge-base.ts
 */

import 'dotenv/config'

const MANAGEMENT_API_BASE = 'https://management-api.x.ai/v1'
const COLLECTION_ID = process.env.XAI_COLLECTION_ID!
const API_KEY = process.env.XAI_MANAGEMENT_API_KEY!

if (!COLLECTION_ID || !API_KEY) {
  console.error('Missing XAI_COLLECTION_ID or XAI_MANAGEMENT_API_KEY in .env')
  process.exit(1)
}

interface KBDocument {
  title: string
  content: string
  metadata: Record<string, string>
}

// ─── Knowledge Base Documents ────────────────────────────────────────

const documents: KBDocument[] = [
  {
    title: 'Boca Banker Company Profile',
    content: `# Boca Banker — Company Profile

Boca Banker is South Florida's trusted mortgage and real estate finance platform, headquartered in Boca Raton, Florida. The platform is powered by the expertise of Boca Banker, a veteran banker with over 40 years of experience in commercial banking, real estate finance, mortgage lending, refinancing, cost segregation analysis, and tax strategy.

## Key Statistics
- Over $2 billion in loans closed throughout career
- 61+ verified 5-star client reviews
- 40+ years of South Florida banking experience
- 500+ cost segregation studies completed

## Core Services
1. **Residential Mortgages**: Conventional, FHA, VA, USDA, jumbo, and specialty loan programs
2. **Refinancing**: Rate-and-term refinance, cash-out refinance, and streamline options
3. **Commercial Financing**: DSCR loans, SBA 504/7(a), bridge loans, commercial mortgages
4. **Cost Segregation Analysis**: AI-powered preliminary estimates and referrals for full engineering studies
5. **Real Estate Guidance**: Property analysis, market insights, and investment strategy

## Location & Service Area
- Headquarters: Boca Raton, Palm Beach County, Florida
- Primary service area: Palm Beach County, Broward County, Miami-Dade County
- Also serves all of Florida and can work with clients nationwide

## Contact
- Website: bocabanker.com
- The AI chat is available 24/7 for instant guidance
- For personalized service, schedule a consultation through the platform

## What Makes Boca Banker Different
Boca Banker takes a relationship-first approach. He's not just closing loans — he's helping clients make smart long-term financial decisions. His deep local market knowledge of South Florida, combined with 40 years of experience across every market cycle, means clients get advice rooted in real-world experience, not just algorithms.`,
    metadata: { category: 'company', topic: 'profile' },
  },

  {
    title: 'South Florida Mortgage Market Guide',
    content: `# South Florida Mortgage Market Guide

## Market Overview
South Florida (Palm Beach, Broward, and Miami-Dade counties) is one of the most dynamic real estate markets in the United States. Key characteristics:

- **High property values**: Median home prices typically range from $400K–$700K+ depending on the area, with luxury coastal properties reaching into the millions
- **Jumbo loan territory**: Many South Florida properties exceed conforming loan limits ($766,550 in most FL counties for 2025), making jumbo loan expertise essential
- **Insurance costs**: Coastal properties face elevated homeowners insurance and flood insurance costs, which significantly impact monthly payments and qualification
- **Property taxes**: Florida has no state income tax, but property taxes (ad valorem) vary by county — typically 1.5%–2.5% of assessed value
- **Condo market**: Unique considerations including HOA fees, reserve requirements (post-Surfside legislation), and lender approval requirements
- **Investment market**: Strong rental demand drives DSCR and investor-focused lending

## Key Areas and Neighborhoods

### Palm Beach County
- **Boca Raton**: Upscale residential and commercial market. Median home prices $550K–$800K+. Strong demand for jumbo and luxury financing.
- **West Palm Beach**: Rapidly growing downtown, mixed residential/commercial. Good mix of conventional and FHA opportunities.
- **Delray Beach**: Beach community with rising property values. Popular with both primary residents and investors.
- **Jupiter / Palm Beach Gardens**: Northern PBC communities with family-oriented markets and golf communities.
- **Wellington**: Equestrian community with unique estate properties.

### Broward County
- **Fort Lauderdale**: Urban core with diverse property types. Strong condo and multifamily market.
- **Pompano Beach / Deerfield Beach**: More affordable coastal options, popular with first-time buyers.
- **Coral Springs / Parkland**: Suburban family communities with strong school districts.
- **Hollywood**: Diverse market from beach condos to inland residential.

### Miami-Dade County
- **Miami**: International market with foreign buyer activity. Condo and luxury segments.
- **Miami Beach / South Beach**: Ultra-luxury condo market. Complex financing requirements.
- **Coral Gables / Coconut Grove**: Established affluent neighborhoods.
- **Homestead / Florida City**: More affordable options in southern Miami-Dade.

## Common Loan Scenarios in South Florida
1. **First-time buyers**: FHA or conventional with 3–5% down. Often need down payment assistance programs. Insurance costs can be a qualifying challenge.
2. **Move-up buyers**: Conventional or jumbo. Bridge financing sometimes needed for buy-before-sell situations.
3. **Investors**: DSCR loans, portfolio loans, or conventional investment property loans (typically 20–25% down, 0.5–0.75% rate premium).
4. **Condo buyers**: Must verify building meets lender requirements (reserves, litigation, owner-occupancy ratio). Post-Surfside structural requirements add complexity.
5. **Retirees**: Fixed income qualification, reverse mortgages (HECM), or large-balance conventional with strong reserves.

## Insurance Considerations
South Florida borrowers face unique insurance challenges:
- Citizens Property Insurance (state insurer of last resort) — often the only option for older coastal properties
- Flood insurance required for most coastal and low-lying properties
- Wind mitigation inspections can significantly reduce premiums
- 4-point inspections required for properties over 25 years old
- Some lenders escrow insurance; others allow self-pay for larger loans`,
    metadata: { category: 'market', topic: 'south-florida' },
  },

  {
    title: 'Cost Segregation Case Studies by Property Type',
    content: `# Cost Segregation Case Studies — Real-World Examples

## What Is Cost Segregation?
Cost segregation is a tax strategy that identifies and reclassifies building components from real property (39-year commercial / 27.5-year residential rental depreciation) into shorter-life personal property categories (5, 7, and 15-year MACRS classes), accelerating depreciation deductions.

## Case Study 1: Office Building — Boca Raton
- **Property**: 15,000 SF Class A office building
- **Purchase price**: $4.2 million (land: $700K, building: $3.5M)
- **Depreciable basis**: $3,500,000
- **Cost seg results**: 28% reclassified ($980,000)
  - 5-year property: $490,000 (specialized electrical, decorative finishes, custom cabinetry)
  - 7-year property: $147,000 (furniture, specialized equipment)
  - 15-year property: $343,000 (parking lot, landscaping, sidewalks)
- **Year 1 accelerated depreciation**: ~$630,000 (with bonus depreciation)
- **Tax savings at 37% bracket**: ~$233,000 in year 1
- **Study cost**: ~$12,000
- **ROI**: 19:1

## Case Study 2: Multifamily Apartment Complex — West Palm Beach
- **Property**: 48-unit garden-style apartment complex
- **Purchase price**: $8.5 million (land: $1.5M, building: $7M)
- **Depreciable basis**: $7,000,000
- **Cost seg results**: 32% reclassified ($2,240,000)
  - 5-year property: $1,120,000 (kitchen appliances, carpet, window treatments, specialty plumbing)
  - 7-year property: $280,000 (common area furnishings)
  - 15-year property: $840,000 (parking areas, fencing, pool/recreation improvements)
- **Year 1 accelerated depreciation**: ~$1,450,000
- **Tax savings at 37% bracket**: ~$536,000 in year 1
- **Study cost**: ~$18,000
- **ROI**: 30:1

## Case Study 3: Retail Strip Center — Fort Lauderdale
- **Property**: 30,000 SF retail center with 8 tenant spaces
- **Purchase price**: $6.2 million (land: $1.2M, building: $5M)
- **Depreciable basis**: $5,000,000
- **Cost seg results**: 25% reclassified ($1,250,000)
  - 5-year property: $600,000 (tenant improvements, specialty lighting, signage)
  - 15-year property: $650,000 (parking lot, stormwater systems, landscaping)
- **Year 1 accelerated depreciation**: ~$800,000
- **Tax savings at 37% bracket**: ~$296,000 in year 1

## Case Study 4: Warehouse / Industrial — Pompano Beach
- **Property**: 50,000 SF industrial warehouse
- **Purchase price**: $5.8 million (land: $1.3M, building: $4.5M)
- **Cost seg results**: 22% reclassified ($990,000)
  - 5-year property: $495,000 (specialized electrical systems, heavy-duty flooring, dock equipment)
  - 15-year property: $495,000 (paving, drainage, exterior improvements)
- **Year 1 accelerated depreciation**: ~$640,000
- **Tax savings at 37% bracket**: ~$237,000

## Case Study 5: Hotel / Hospitality — Delray Beach
- **Property**: 120-room boutique hotel
- **Purchase price**: $22 million (land: $5M, building: $17M)
- **Cost seg results**: 35% reclassified ($5,950,000) — hotels typically have the highest reclassification rates due to furniture, fixtures, and specialty systems
  - 5-year property: $3,400,000 (FF&E, kitchen equipment, telecom, specialty lighting)
  - 7-year property: $850,000 (furniture, gym equipment, AV systems)
  - 15-year property: $1,700,000 (pool, parking, landscaping, exterior signage)
- **Year 1 accelerated depreciation**: ~$3,850,000
- **Tax savings at 37% bracket**: ~$1,425,000

## General Guidelines by Property Type
| Property Type | Typical Reclassification % | Best Candidates |
|---|---|---|
| Hotels/Hospitality | 30–40% | Highest due to FF&E |
| Restaurants | 30–40% | Kitchen equipment, specialty systems |
| Multifamily (Apartment) | 25–35% | Appliances, site improvements |
| Office (Class A) | 25–30% | Decorative finishes, specialized systems |
| Retail | 20–28% | Tenant improvements, parking |
| Warehouse/Industrial | 15–25% | Lower due to simpler construction |
| Healthcare/Medical | 25–35% | Specialized equipment, plumbing |

## When to Consider Cost Segregation
- Property acquired, built, or renovated for $500,000+ (some benefit at lower amounts)
- Held for investment or business use (not primary residence)
- Owner is in a 24%+ tax bracket (higher brackets = larger dollar savings)
- Property was acquired within the last few years (can do lookback study for older properties)
- Planning to hold the property for at least 5+ years`,
    metadata: { category: 'cost-segregation', topic: 'case-studies' },
  },

  {
    title: 'Mortgage Product Comparison Guide',
    content: `# Mortgage Product Comparison Guide

## Residential Loan Programs

### Conventional Loans
- **Conforming limit**: $766,550 (2025, most FL counties)
- **Minimum down payment**: 3% (first-time buyers) to 5% (repeat buyers)
- **Credit score**: 620+ minimum, best rates at 740+
- **PMI**: Required below 20% down; auto-drops at 78% LTV
- **DTI**: Up to 45% (50% with strong compensating factors)
- **Best for**: Borrowers with good credit and 10%+ down payment
- **Rate advantage**: Typically the lowest rates for well-qualified borrowers

### FHA Loans
- **Maximum loan**: $557,750 (standard FL counties), higher in some areas
- **Minimum down payment**: 3.5% with 580+ credit score (10% with 500–579)
- **MIP**: 0.85% annual + 1.75% upfront (for the life of the loan on most FHA)
- **DTI**: Up to 57% with automated approval
- **Best for**: First-time buyers, lower credit scores, small down payments
- **Note**: MIP for the life of the loan is a significant long-term cost — consider refinancing to conventional once you reach 20% equity

### VA Loans
- **Down payment**: 0% — no down payment required
- **PMI**: None
- **Funding fee**: 2.15% first use, 3.3% subsequent use (can be financed)
- **Credit score**: No VA minimum (most lenders want 620+)
- **Best for**: Veterans, active military, surviving spouses
- **Key advantage**: Typically 0.25–0.50% lower rates than conventional, plus no PMI — this is the best deal in mortgages for those who qualify

### USDA Loans
- **Down payment**: 0%
- **Guarantee fee**: 1% upfront + 0.35% annual
- **Income limits**: Household income must be ≤115% of area median
- **Location**: Must be in USDA-eligible rural/suburban area
- **Best for**: Moderate-income buyers in eligible areas

### Jumbo Loans
- **Loan amount**: Above $766,550 (conforming limit)
- **Down payment**: Typically 10–20%
- **Credit score**: Usually 700+ required
- **Reserves**: 6–12 months of payments in liquid reserves
- **Rate**: May be 0.25–0.50% above conventional, but competitive in current market
- **Best for**: High-value South Florida properties (very common in Boca Raton, Palm Beach)

## Investment Property Loans

### Conventional Investment
- **Down payment**: 15–25% (single family: 15%, 2–4 unit: 25%)
- **Rate premium**: Typically 0.50–0.75% above primary residence
- **Reserve requirements**: 6 months per financed property
- **Property limit**: Up to 10 financed properties (Fannie Mae)
- **Best for**: Small portfolio investors with strong credit and reserves

### DSCR Loans (Debt Service Coverage Ratio)
- **Qualification**: Based on property cash flow, not borrower income
- **DSCR requirement**: Typically 1.0–1.25x (rental income / mortgage payment)
- **Down payment**: 20–25%
- **No income docs**: No W-2s, tax returns, or employment verification
- **Best for**: Self-employed investors, investors with complex tax returns, scaling portfolios
- **Rate**: Typically 1–2% above conventional — premium for easier qualification

### Commercial Mortgages
- **Loan amount**: $500K–$50M+
- **LTV**: Typically 65–80%
- **DSCR**: 1.2x–1.5x required
- **Terms**: 5, 7, or 10-year fixed periods with 25–30 year amortization
- **Prepayment**: Often has yield maintenance or defeasance requirements
- **Best for**: Income-producing commercial properties (office, retail, industrial, multifamily 5+ units)

### SBA 504 Loans
- **For**: Owner-occupied commercial properties
- **Structure**: 50% bank loan + 40% SBA debenture + 10% down
- **Max loan**: $5 million (up to $5.5M for manufacturing)
- **Rate**: Below-market fixed rate on the SBA portion
- **Best for**: Small business owners purchasing their own commercial space

## Refinancing Options

### Rate-and-Term Refinance
- Replaces existing loan with better rate or different term
- No cash out (or minimal cash out ≤ $2,000)
- Break-even calculation: closing costs ÷ monthly savings
- Generally worth it if break-even is under 24 months

### Cash-Out Refinance
- Access up to 80% of property value (minus existing loan balance)
- Slightly higher rate than rate-and-term (typically 0.125–0.25%)
- Common uses: renovation, debt consolidation, investment capital
- Note: Resets amortization clock — total interest paid over new loan term increases

### Streamline Refinance
- **FHA Streamline**: No appraisal, no income verification, minimal docs
- **VA IRRRL**: Interest Rate Reduction Refinance Loan, minimal requirements
- **Best for**: Existing FHA/VA borrowers seeking lower rate with minimal hassle`,
    metadata: { category: 'mortgages', topic: 'product-comparison' },
  },

  {
    title: 'Common Client Scenarios and Solutions',
    content: `# Common Client Scenarios — How Boca Banker Helps

## Scenario 1: First-Time Homebuyer in Boca Raton
**Client profile**: Young professional, $85K salary, $15K saved, 720 credit score
**Challenge**: Boca Raton median prices ($550K+) seem out of reach
**Solution**:
- FHA loan at 3.5% down on a $450K condo: $15,750 down payment
- Monthly P&I: ~$2,560 (at 6.5%, 30-year)
- Plus MIP, taxes, insurance, HOA: total ~$3,800/month
- DTI check: $3,800 / $7,083 gross monthly = 53.6% — within FHA guidelines
- Alternative: Look at nearby Deerfield Beach or Coconut Creek for lower price points
- Tip: Get pre-approved first, then shop with confidence

## Scenario 2: Investor Purchasing Multifamily Property
**Client profile**: Experienced investor, owns 3 properties, wants a 12-unit in West Palm Beach ($2.4M)
**Challenge**: Complex tax returns make income qualification difficult
**Solution**:
- DSCR loan: qualifies on property income, not personal income
- Property generates $18,000/month in rent
- Monthly PITI: ~$14,500 → DSCR = 1.24x (qualifies)
- 25% down: $600,000
- Cost segregation study: ~$2.4M property × 30% reclassification = $720K accelerated
- Year 1 tax savings with bonus depreciation: ~$266,000
- Combined strategy: DSCR loan + cost seg = cash-flow positive with major tax benefits

## Scenario 3: Commercial Property Owner Seeking Refinance + Cost Seg
**Client profile**: Owns 25,000 SF office building in Coral Springs, purchased 3 years ago for $3.5M at 7.25%
**Challenge**: High interest payments eating into cash flow
**Solution**:
- Refinance from 7.25% to 6.0% on $2.8M remaining balance
- Monthly savings: ~$2,450/month ($29,400/year)
- Closing costs: ~$42,000 → break-even in 17 months ✓
- Cost segregation (lookback study on original $3.5M purchase): 27% reclassification = $945K
- Can file amended returns to capture missed depreciation from prior years
- Combined first-year benefit: $29,400 payment savings + ~$350,000 tax benefit

## Scenario 4: Self-Employed Borrower
**Client profile**: Business owner with $250K net income but complex tax returns showing lower adjusted income
**Challenge**: Tax returns show $90K after deductions — doesn't qualify conventionally
**Solution**:
- Bank statement loan: Uses 12–24 months of business bank statements
- Average monthly deposits of $25K → calculated income of $20K/month
- Qualifies for $550K loan comfortably
- Alternative: DSCR loan if buying investment property
- Tip: 2-year tax return average is what most lenders use — plan with your CPA for optimal reporting

## Scenario 5: Retiree Downsizing
**Client profile**: 68 years old, selling $800K home, buying $500K condo, Social Security + pension income of $5,500/month
**Challenge**: Fixed income qualification, unfamiliar with current market
**Solution**:
- Large down payment from sale proceeds (50%+ down = $250K+)
- Conventional loan at 50% LTV: best rates, no PMI
- Monthly P&I on $250K at 6.25%: ~$1,540
- With low LTV, qualification is straightforward even on fixed income
- Consider 15-year term: higher payment (~$2,150) but saves $130K+ in interest
- Alternative: Pay cash and preserve liquidity with HELOC for emergencies

## Scenario 6: Foreign National Buyer
**Client profile**: Canadian investor purchasing vacation home in Palm Beach
**Challenge**: No US credit history, foreign income
**Solution**:
- Foreign national loan programs available (limited lenders)
- Typically requires 30–35% down payment
- Interest rate premium of 1–2% above conventional
- Need valid passport, proof of foreign income, US bank account
- Some lenders accept Canadian credit bureau reports
- Tip: Establish a US banking relationship 6+ months before applying

## Scenario 7: Condo Buyer — Post-Surfside Requirements
**Client profile**: Buyer interested in a 1990s condo in Fort Lauderdale
**Challenge**: Building may not meet new structural requirements
**Solution**:
- Verify building has completed milestone inspection (required for buildings 25+ years old within 3 miles of coast)
- Check if HOA reserves meet new statutory requirements (no reserve waiver allowed for structural items)
- Confirm building is on approved lender lists (Fannie Mae, FHA)
- If building isn't approved: consider portfolio lenders or larger down payment
- Tip: Always review the HOA's financial statements and reserve study before making an offer`,
    metadata: { category: 'scenarios', topic: 'client-solutions' },
  },

  {
    title: 'Bonus Depreciation Schedule and Tax Strategy',
    content: `# Bonus Depreciation & Tax Strategy for Real Estate Investors

## Bonus Depreciation Phase-Down Schedule
The Tax Cuts and Jobs Act (TCJA) of 2017 introduced 100% bonus depreciation, which is now phasing down:

| Tax Year | Bonus Depreciation % |
|---|---|
| 2022 | 100% |
| 2023 | 80% |
| 2024 | 60% |
| 2025 | 40% |
| 2026 | 20% |
| 2027+ | 0% (unless extended by Congress) |

**Why this matters**: The declining bonus depreciation rate makes cost segregation studies increasingly urgent. A study done in 2025 captures 40% bonus depreciation on reclassified assets; waiting until 2027 means no bonus depreciation at all.

## How Cost Segregation + Bonus Depreciation Work Together
1. Cost segregation identifies building components that qualify for 5-year, 7-year, or 15-year MACRS lives (instead of 27.5 or 39 years)
2. Bonus depreciation allows a percentage of these reclassified assets to be deducted in year 1
3. The remaining basis follows normal MACRS depreciation schedules

**Example** (2025, 40% bonus depreciation):
- $5M building, cost seg reclassifies 30% = $1.5M into shorter-life assets
- Bonus depreciation: $1.5M × 40% = $600,000 deducted in year 1
- Remaining $900,000 follows 5/7/15-year MACRS schedules
- At 37% tax bracket: $600,000 × 37% = $222,000 in year 1 tax savings from bonus alone

## MACRS Depreciation Schedules
| Asset Class | Recovery Period | Example Components |
|---|---|---|
| 5-year | 5 years | Appliances, carpet, decorative finishes, specialty electrical, specialty plumbing |
| 7-year | 7 years | Office furniture, fixtures, equipment |
| 15-year | 15 years | Land improvements — parking lots, landscaping, sidewalks, fencing, stormwater |
| 27.5-year | 27.5 years | Residential rental property (structural components) |
| 39-year | 39 years | Commercial property (structural components) |

## Lookback Studies
If you purchased a property in prior years and never did a cost segregation study, you can still capture the benefit:
- File IRS Form 3115 (Change in Accounting Method)
- Claim all missed depreciation in a single year (Section 481(a) adjustment)
- No need to amend prior tax returns
- Can create a large deduction in the current tax year
- Works for properties acquired up to the full useful life ago

## Passive Activity Loss Rules
Cost segregation often creates large paper losses. Key rules:
- Real estate professionals (750+ hours/year in real estate, material participation) can deduct losses against ordinary income
- Non-real estate professionals: losses are passive and can only offset passive income, unless they qualify for the $25,000 active participation exception (phases out at $100K–$150K AGI)
- Excess passive losses carry forward to future years
- Strategy: Investors with passive income from other rental properties can use cost seg losses to offset that income

## Section 1031 Like-Kind Exchanges
When selling investment property:
- Exchange into a like-kind property to defer all capital gains and depreciation recapture taxes
- Must identify replacement property within 45 days, close within 180 days
- Accelerated depreciation from cost seg increases recapture potential — plan accordingly
- Combined strategy: Do cost seg → enjoy accelerated depreciation → 1031 exchange to defer recapture → do cost seg on new property → repeat

## Combined Mortgage + Tax Strategy Examples
1. **Refinance + Cost Seg**: Refinance at a lower rate → monthly savings. Do cost seg → large year 1 tax refund. Use tax refund to cover refinance closing costs or pay down principal.
2. **Purchase + Cost Seg**: Use cost seg tax savings to offset the cash flow impact of a higher-rate mortgage. A $300K tax benefit in year 1 effectively subsidizes higher payments for years.
3. **Cash-Out Refi + Cost Seg**: Pull equity from Property A. Use cash-out proceeds as down payment on Property B. Do cost seg on both properties. Net result: leveraged portfolio growth with maximized tax benefits on both assets.`,
    metadata: { category: 'tax-strategy', topic: 'bonus-depreciation' },
  },

  {
    title: 'Boca Banker Platform Features and How to Use Them',
    content: `# Boca Banker Platform — Features & How to Use

## AI Chat Assistant
The Boca Banker AI chat is available 24/7 and provides:
- **Instant mortgage guidance**: Ask about any loan program, rate, or qualification question
- **Payment calculations**: Get exact monthly payment breakdowns including principal, interest, taxes, and insurance
- **Cost segregation estimates**: Provide property details and get a preliminary cost seg analysis
- **Market insights**: Live web search provides current mortgage rates, market conditions, and local data
- **Lead capture**: Share your contact info and the system notes it for personalized follow-up

### How to Use the Chat
1. Go to bocabanker.com and click "Chat with Boca Banker"
2. No signup required — guests can chat immediately
3. Ask your question in plain English — about mortgages, rates, cost segregation, refinancing, or any real estate finance topic
4. For personalized estimates, share your property details (type, location, value)
5. To schedule a deeper consultation, just ask in the chat

### What the Chat Can Calculate
- Monthly mortgage payments (P&I, taxes, insurance)
- Total interest over the life of a loan
- Refinance break-even analysis
- Loan comparison scenarios (15-year vs 30-year, different rates)
- Cost segregation estimates by property type
- Affordability based on income and debts

## Client Dashboard (Registered Users)
Registered users get access to:
- **Chat history**: All conversations saved and searchable
- **Lead management**: Track potential clients and property opportunities
- **Document storage**: Upload and organize property documents
- **Review management**: View and respond to client reviews

## For Mortgage Professionals
Boca Banker also serves as a tool for loan officers and mortgage brokers:
- Use the AI chat to quickly model loan scenarios for clients
- Get instant cost segregation estimates to add value to investor clients
- Access current rate data through live web search
- Manage leads captured through the platform
- Arive LOS integration for seamless loan origination

## Getting Started
1. **Free chat**: Available immediately at bocabanker.com — no account needed
2. **Create account**: Sign up for full platform access including chat history and CRM tools
3. **Schedule consultation**: Request a one-on-one with Boca Banker for complex scenarios
4. **Apply for a loan**: When ready, submit your application through the Arive platform link`,
    metadata: { category: 'platform', topic: 'features' },
  },

  {
    title: 'Current Mortgage Rate Environment and Guidance',
    content: `# Understanding Mortgage Rates — What Clients Need to Know

## How Mortgage Rates Work
- Rates are influenced by: Federal Reserve policy, inflation, Treasury yields, economic data, credit markets
- Individual rates depend on: credit score, down payment/LTV, property type, occupancy, loan amount, points
- Rate types: Fixed (locked for full term), ARM (adjustable-rate, lower initial rate that adjusts after fixed period)

## Rate Tiers by Credit Score (Typical Spread)
| Credit Score | Rate Impact |
|---|---|
| 760+ | Best available rate |
| 740–759 | +0.125% |
| 720–739 | +0.25% |
| 700–719 | +0.375% |
| 680–699 | +0.50% |
| 660–679 | +0.75% |
| 640–659 | +1.0% |
| 620–639 | +1.25–1.5% |

## Rate Adjustments by Loan Feature
- Investment property: +0.50–0.75%
- Cash-out refinance: +0.125–0.25%
- Condo: +0.125–0.25% (high-rise may be more)
- Multi-unit (2–4): +0.25–0.50%
- Jumbo loans: varies, sometimes competitive with conforming
- 15-year term: typically 0.50–0.75% below 30-year
- ARM (5/1 or 7/1): typically 0.50–1.0% below 30-year fixed

## Points vs. Rate
- 1 discount point = 1% of loan amount = approximately 0.25% rate reduction
- Break-even on points: typically 4–6 years
- Paying points makes sense if: holding property long-term, have cash available, want lowest possible payment
- Zero-point option: slightly higher rate, no upfront cost

## When to Lock a Rate
- Lock as soon as you have a signed contract and are within the lock period (typically 30–60 days to close)
- Rate locks cost money — longer locks are more expensive
- Float-down options: some lenders offer a one-time float-down if rates drop after lock
- In a volatile rate environment, locking early reduces risk

## Rate Shopping Tips for Borrowers
1. Get quotes from at least 3 lenders on the same day for accurate comparison
2. Compare APR (not just rate) — APR includes fees and gives true cost of borrowing
3. Ask for the same lock period and point structure for apples-to-apples comparison
4. Don't confuse rate with total cost — a 6.0% rate with $8,000 in fees may cost more than 6.125% with $3,000 in fees
5. Credit pulls within a 14–45 day window count as a single inquiry for scoring purposes

## Important Note
Boca Banker provides live rate information through web search when asked. For the most current rates, simply ask "What are today's mortgage rates?" in the chat. Boca Banker will search for the latest data and provide context based on your specific situation.`,
    metadata: { category: 'mortgages', topic: 'rates-guidance' },
  },

  {
    title: 'Florida-Specific Real Estate and Tax Information',
    content: `# Florida-Specific Real Estate & Tax Information

## Florida Tax Advantages
- **No state income tax**: Florida residents pay no state income tax on personal or business income
- **Homestead exemption**: Primary residence gets up to $50,000 property tax exemption
- **Save Our Homes (SOH) cap**: Annual assessed value increase capped at 3% or CPI (whichever is lower) for homesteaded properties
- **Portability**: Can transfer up to $500,000 of SOH differential to a new homestead within FL
- **No estate tax / inheritance tax**: Florida does not impose estate or inheritance taxes

## Florida Property Tax Basics
- **Assessment**: Properties assessed at "just value" (market value) by county Property Appraiser
- **Millage rates**: Vary by county, city, and special districts — typically 15–25 mills total
- **Tax rate equivalent**: 1.5–2.5% of assessed value for non-homestead properties
- **Homesteaded properties**: Effective rate much lower due to exemptions and SOH cap
- **Tangible personal property tax**: Business equipment and furnishings also taxed (separate from real property)
- **Payment**: Due by March 31 each year; discounts for early payment (4% in November, 3% December, 2% January, 1% February)

## Florida Condo and HOA Regulations (Post-Surfside)
Florida significantly strengthened condo regulations after the Champlain Towers collapse in 2021:

### Milestone Inspections (SB 4D / SB 154)
- Required for buildings 3+ stories, 25+ years old (or 30+ years if more than 3 miles from coast)
- Phase 1: Visual inspection by licensed engineer or architect
- Phase 2: Required if Phase 1 finds substantial structural deterioration
- Must be completed on a recurring 10-year cycle
- **Impact on buyers**: Check if the building has completed its milestone inspection before purchasing

### Reserve Requirements
- HOAs can no longer waive reserves for structural components
- Reserve study required every 10 years
- Reserves must be funded for: roof, structure, fireproofing, plumbing, electrical, waterproofing, windows
- **Impact on buyers**: HOA fees may increase significantly in buildings that previously waived reserves
- **Impact on lenders**: Some buildings may no longer qualify for Fannie Mae/FHA financing if reserves are insufficient

## Florida Homeowner Insurance Market
- Florida's insurance market has been challenging:
  - Multiple insurer insolvencies and market exits in recent years
  - Citizens Property Insurance (state-backed insurer) has grown significantly
  - Premiums have increased substantially, especially for coastal properties
  - Reforms in 2022–2023 (SB 2A, SB 7052) aimed at stabilizing the market
- **Wind mitigation**: A wind mitigation inspection can significantly reduce premiums — highly recommended for all FL homeowners
- **Flood insurance**: Required by most lenders for properties in flood zones A or V; recommended for all FL properties
- **Roof age**: Insurers often require roofs less than 15–20 years old; some won't insure older roofs

## Florida Real Estate Closing Process
- Florida is NOT an attorney state for residential closings (title companies handle most closings)
- Attorney review is optional but recommended for complex transactions
- Documentary stamp tax: $0.70 per $100 on deed (seller pays), $0.35 per $100 on mortgage (buyer pays)
- Intangible tax on new mortgages: $0.002 per dollar of mortgage amount
- Title insurance: Buyer typically pays for lender's policy; seller typically pays for owner's policy
- Closing timeline: Typically 30–45 days for residential, 60–90 days for commercial

## Florida Landlord-Tenant Basics (For Investor Clients)
- No rent control in Florida (preempted by state law)
- Security deposit: must be held in a separate Florida banking account, returned within 15–60 days after move-out
- Eviction process: 3-day notice for nonpayment, 7-day notice for lease violations
- Florida is generally considered landlord-friendly compared to many states
- No local registration requirements in most FL jurisdictions (unlike NYC, LA, etc.)`,
    metadata: { category: 'florida', topic: 'tax-and-regulations' },
  },

  {
    title: 'Client Reviews and Testimonials Summary',
    content: `# Client Reviews & Testimonials — Boca Banker

## Overview
- **Total verified reviews**: 61+
- **Average rating**: 5.0 stars (perfect rating)
- **Review sources**: Verified client feedback, public review platforms

## Common Themes in Client Reviews

### Exceptional Communication
Clients consistently praise Boca Banker's responsiveness and communication style. He explains complex financial concepts in clear, understandable terms and keeps clients informed throughout the entire process. Multiple reviewers note that he responds quickly to calls and emails, even outside normal business hours.

### Deep Market Knowledge
Reviewers highlight Boca Banker's unmatched knowledge of the South Florida market. His 40+ years of experience in Boca Raton gives him insights that newer loan officers simply cannot match — from understanding neighborhood-specific property values to knowing which lenders offer the best terms for specific property types.

### Personal Touch
A recurring theme is that Boca Banker treats every client like family, not a transaction. He takes the time to understand each client's unique financial situation and goals, then crafts a customized strategy. Clients appreciate that he's genuinely invested in their long-term financial well-being, not just closing a deal.

### Problem-Solving Ability
Several reviews mention Boca Banker's ability to get deals done when others couldn't. His extensive network of lenders and industry contacts, combined with creative problem-solving, means he can find solutions for complex situations — self-employed borrowers, unique property types, tight timelines, and challenging credit profiles.

### Competitive Rates
Clients frequently note that Boca Banker secured rates that were lower than what competitors offered. His relationships with multiple lenders allow him to shop for the best available terms, and his reputation in the industry often results in preferential pricing.

## Types of Clients Served
Based on review data, Boca Banker serves a diverse client base:
- First-time homebuyers
- Experienced real estate investors
- Self-employed business owners
- Retirees
- Foreign nationals purchasing in South Florida
- Commercial property owners
- Clients seeking cost segregation analysis
- Refinance clients

## Loan Types Referenced in Reviews
- Conventional purchase
- FHA purchase
- VA loans
- Jumbo loans
- Refinance (rate-and-term and cash-out)
- Commercial mortgages
- DSCR / investor loans
- 15-year and 30-year fixed terms
- ARM products

## Client Satisfaction Indicators
- Many reviewers are repeat clients or referrals from previous clients
- Multiple reviews mention Boca Banker helping through difficult or stressful financial situations
- Several clients note they've referred friends and family members
- Consistent praise across all property types and loan programs
- Reviews span many years, showing sustained quality of service`,
    metadata: { category: 'reviews', topic: 'testimonials' },
  },
]

// ─── Upload Logic ────────────────────────────────────────────────────

async function uploadDocument(doc: KBDocument): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // xAI Collections API requires multipart/form-data
    const formData = new FormData()
    const blob = new Blob([doc.content], { type: 'text/markdown' })
    const filename = doc.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.md'

    formData.append('name', filename)
    formData.append('data', blob, filename)
    formData.append('content_type', 'text/markdown')

    const response = await fetch(
      `${MANAGEMENT_API_BASE}/collections/${COLLECTION_ID}/documents`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${API_KEY}`,
        },
        body: formData,
      },
    )

    if (!response.ok) {
      const body = await response.text()
      return { success: false, error: `${response.status} ${body}` }
    }

    const data = await response.json()
    return { success: true, id: data.document_id || data.id || 'unknown' }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

async function main() {
  console.log(`\nUploading ${documents.length} documents to collection: ${COLLECTION_ID}\n`)

  let success = 0
  let failed = 0

  for (const doc of documents) {
    process.stdout.write(`  Uploading: ${doc.title}...`)
    const result = await uploadDocument(doc)

    if (result.success) {
      console.log(` ✓ (${result.id})`)
      success++
    } else {
      console.log(` ✗ (${result.error})`)
      failed++
    }

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  console.log(`\nDone: ${success} uploaded, ${failed} failed\n`)

  if (failed > 0) {
    process.exit(1)
  }
}

main()
