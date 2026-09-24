/**
 * Content for the public topic pages (/refinance, /condo-loans, …).
 *
 * Paragraph text supports inline links written as [label](/path).
 *
 * Compliance notes for anyone editing: keep this educational. Don't quote
 * rates, APRs or payments as an offer (the calculator's default rate is the
 * labeled Freddie Mac average). Program requirements change, so prefer "generally"
 * and "typically" over hard promises.
 */

export type Block =
  | string
  | { list: string[] }
  | { steps: string[] }
  | { note: string }

export interface TopicSection {
  heading: string
  blocks: Block[]
}

export interface Topic {
  slug: string
  /** Short label for the header nav. */
  navLabel: string
  /** Label for the footer's "Loans & tools" column. */
  footerLabel: string
  /** Used on "related" cards. */
  cardTitle: string
  cardDesc: string
  /** <title> (the layout appends "| Boca Banker") and meta description. */
  title: string
  description: string
  eyebrow: string
  h1: string
  intro: string
  chatPrompt: string
  ctaLabel: string
  highlights?: { title: string; desc: string }[]
  sections: TopicSection[]
  faqs: { q: string; a: string }[]
  related: string[]
  /** schema.org Service type, for loan/service pages. */
  serviceType?: string
}

const refinance: Topic = {
  slug: '/refinance',
  navLabel: 'Refinancing',
  footerLabel: 'Refinancing',
  cardTitle: 'Refinancing',
  cardDesc: 'When a refinance pays off, the break-even math, and what Florida adds to closing costs.',
  title: 'Mortgage Refinance in Boca Raton & South Florida',
  description:
    'When refinancing pays off, how to run the break-even math, and what Florida adds to closing costs. Rate-and-term, cash-out, and FHA or VA streamline options.',
  eyebrow: 'Refinancing · Boca Raton & South Florida',
  h1: 'Refinance when the math works, not when the ads say so.',
  intro:
    'A refinance replaces your current mortgage with a new one. It can lower your payment, shorten your term, drop mortgage insurance or turn equity into cash, but every refinance has closing costs. What matters is how long it takes to earn them back.',
  chatPrompt:
    'I’m thinking about refinancing my mortgage. Can you help me figure out whether it makes sense and what my break-even would be?',
  ctaLabel: 'Run my refinance numbers',
  serviceType: 'Mortgage refinancing',
  highlights: [
    {
      title: 'Break-even first',
      desc: 'Closing costs divided by monthly savings tells you how many months until a refinance pays for itself.',
    },
    {
      title: 'The right kind of refinance',
      desc: 'Rate-and-term, cash-out, or a streamline refinance if you already have an FHA or VA loan.',
    },
    {
      title: 'Florida costs included',
      desc: 'Florida taxes new mortgage notes, so doc stamps and intangible tax belong in the math.',
    },
  ],
  sections: [
    {
      heading: 'When refinancing makes sense',
      blocks: [
        'Most refinances come down to one of five goals:',
        {
          list: [
            'A lower rate: rates have dropped meaningfully since you took out your loan.',
            'Dropping mortgage insurance: you have an FHA loan and now have 20% or more equity, so a conventional loan could remove the monthly premium.',
            'A shorter term: moving from 30 to 15 years usually brings a lower rate and far less total interest, at a higher monthly payment.',
            'Fixed instead of adjustable: your ARM is nearing an adjustment and you want a payment that won’t change.',
            'Cash out: you want to use equity for renovations, hurricane hardening, paying off higher-rate debt, or a down payment on another property.',
          ],
        },
        'If none of those apply, the best move is often to keep the loan you have.',
      ],
    },
    {
      heading: 'The break-even math',
      blocks: [
        'Divide your total closing costs by how much you’ll save each month. The result is the number of months before the refinance starts putting money in your pocket.',
        {
          note: 'Example: $6,000 in closing costs ÷ $250 in monthly savings = 24 months. If you expect to keep the loan longer than two years, the refinance likely pays off. If you might sell sooner, it probably doesn’t.',
        },
        'The monthly payment isn’t the whole picture. Restarting a 30-year clock on a loan you’ve paid for eight years can lower the payment while raising the total interest you pay. Compare the total cost over the years you plan to stay, not just the payment.',
      ],
    },
    {
      heading: 'Rate-and-term vs. cash-out',
      blocks: [
        'A rate-and-term refinance changes the rate, the term or both, and the balance stays about the same. It usually gets the best pricing.',
        'A cash-out refinance borrows more than you owe and pays you the difference. Pricing is typically a little higher, and conventional and FHA cash-out loans on a primary home are generally limited to 80% of the home’s value. VA cash-out loans can go higher for eligible veterans.',
        'If you already have a low rate you’d like to keep, a home equity loan or line of credit may be a better way to reach your equity than replacing the whole mortgage.',
      ],
    },
    {
      heading: 'Streamline options for FHA and VA loans',
      blocks: [
        'If you already have an FHA loan, an FHA Streamline refinance can lower your rate with less paperwork and, in many cases, no new appraisal. VA borrowers have a similar option, the Interest Rate Reduction Refinance Loan (IRRRL). Both require a real benefit to you, such as a lower payment, and a history of on-time payments on the current loan.',
      ],
    },
    {
      heading: 'What Florida adds to closing costs',
      blocks: [
        'Florida taxes new mortgage notes. Expect documentary stamp tax of $0.35 per $100 borrowed and intangible tax of 0.2% of the loan amount. On a $400,000 refinance, that’s about $1,400 in doc stamps and $800 in intangible tax, before lender, title and appraisal fees.',
        'Two things a refinance doesn’t change are your homestead exemption and your Save Our Homes assessment cap. Both come from owning and living in the home, not from the mortgage, so refinancing won’t reset your property taxes.',
        'You’ll also need a current homeowners insurance policy, and flood insurance if the home is in a special flood hazard area. Try the [mortgage calculator](/mortgage-calculator) to see a full monthly payment with taxes and insurance.',
      ],
    },
  ],
  faqs: [
    {
      q: 'How much does it cost to refinance in Florida?',
      a: 'Closing costs commonly run 2% to 5% of the loan amount. That includes lender fees, the appraisal, title insurance, and Florida’s documentary stamp and intangible taxes on the new note. Some lenders offer credits in exchange for a slightly higher rate, which lowers the upfront cost.',
    },
    {
      q: 'How soon after buying can I refinance?',
      a: 'For a rate-and-term refinance there’s often no waiting period. Cash-out and streamline refinances have seasoning rules, generally six months to a year depending on the program.',
    },
    {
      q: 'Does refinancing affect my homestead exemption?',
      a: 'No. Your homestead exemption and Save Our Homes cap are tied to owning and living in the home, not to the mortgage, so a refinance doesn’t reset your assessed value or your property taxes.',
    },
    {
      q: 'Can I get rid of FHA mortgage insurance by refinancing?',
      a: 'Often, yes. FHA loans made with less than 10% down carry mortgage insurance for the life of the loan. Once you have about 20% equity, refinancing into a conventional loan removes it. Whether that saves money depends on the new rate and closing costs, so run the break-even.',
    },
    {
      q: 'Should I refinance into a 15-year loan?',
      a: 'A 15-year loan usually has a lower rate and saves a large amount of interest, but the payment is significantly higher. It fits if the higher payment is comfortable with room to spare. Keeping a 30-year loan and making extra principal payments when you can is a more flexible alternative.',
    },
  ],
  related: ['/mortgage-calculator', '/investors', '/condo-loans'],
}

const firstTimeHomebuyer: Topic = {
  slug: '/first-time-homebuyer',
  navLabel: 'Buying',
  footerLabel: 'First-time homebuyers',
  cardTitle: 'First-time homebuyers',
  cardDesc: 'Down payment options, Florida assistance programs, insurance and the homestead exemption.',
  title: 'First-Time Homebuyer Guide for Boca Raton & South Florida',
  description:
    'Down payment options, Florida assistance programs, insurance, closing costs and the homestead exemption. What first-time buyers in South Florida need to know.',
  eyebrow: 'First-time homebuyers · South Florida',
  h1: 'Your first home in South Florida, without the surprises.',
  intro:
    'Buying your first home here comes with a few things national guides skip: insurance that costs more than you expect, condo rules that can derail a loan, and a homestead exemption that saves real money if you file on time. Here’s what to know before you make an offer.',
  chatPrompt:
    'I’m a first-time homebuyer in South Florida. How much do I need for a down payment, and which loan programs should I look at?',
  ctaLabel: 'Ask about buying your first home',
  serviceType: 'Home purchase mortgage',
  highlights: [
    {
      title: 'Less down than you think',
      desc: 'Several loan programs accept small down payments, and Florida has assistance programs for eligible buyers.',
    },
    {
      title: 'Price insurance early',
      desc: 'South Florida premiums are high. Get quotes before you write an offer, not after.',
    },
    {
      title: 'File for homestead',
      desc: 'Living in the home as your primary residence can lower your property tax bill every year.',
    },
  ],
  sections: [
    {
      heading: 'How much you need for a down payment',
      blocks: [
        'Twenty percent down isn’t required. The most common options for first-time buyers:',
        {
          list: [
            'Conventional loans: some programs let first-time buyers put as little as 3% down. With less than 20% down you pay private mortgage insurance (PMI) until you have enough equity to remove it.',
            'FHA loans: 3.5% down with a credit score of 580 or higher. FHA is more flexible on credit and debt, but its mortgage insurance usually lasts the life of the loan unless you later refinance.',
            'VA loans: eligible veterans and service members can buy with no down payment and no monthly mortgage insurance.',
          ],
        },
        'The right choice depends on your credit, savings and how long you plan to stay. A smaller down payment keeps cash in the bank but raises the monthly payment.',
      ],
    },
    {
      heading: 'Florida down payment assistance',
      blocks: [
        'Florida Housing Finance Corporation runs statewide programs for first-time buyers, including down payment and closing cost assistance paired with a first mortgage and, when funded, the Florida Hometown Heroes program for full-time Florida workers. Palm Beach County, Broward County and some cities offer their own programs too.',
        'These programs have income limits, purchase price limits and a homebuyer education requirement, and funding comes in rounds. Ask early, because availability changes through the year.',
      ],
    },
    {
      heading: 'Costs beyond the down payment',
      blocks: [
        {
          list: [
            'Closing costs: typically 2% to 5% of the purchase price, including lender fees, title insurance, and Florida’s documentary stamp and intangible taxes on your mortgage.',
            'Homeowners insurance: South Florida premiums are among the highest in the country. Older homes may need a 4-point inspection to be insurable, and a wind mitigation inspection can lower your premium if the home has impact windows, shutters or a newer roof.',
            'Flood insurance: required if the home is in a special flood hazard area, and worth pricing even if it isn’t.',
            'HOA or condo dues: common in South Florida, and lenders count them in your monthly debts.',
            'Reserves: savings left over after closing make approval easier and protect you from surprises.',
          ],
        },
        'The [mortgage calculator](/mortgage-calculator) includes taxes, insurance and HOA dues so you can see the full monthly cost.',
      ],
    },
    {
      heading: 'Condo or house?',
      blocks: [
        'Condos are often the most affordable way into Boca Raton, but the lender reviews the building as well as you. Buildings with low reserves, pending special assessments or unfinished structural repairs can be ineligible for conventional or FHA financing. Read the [South Florida condo financing guide](/condo-loans) before you fall for a unit.',
      ],
    },
    {
      heading: 'The homestead exemption',
      blocks: [
        'Once you own and live in the home as your permanent residence, file for Florida’s homestead exemption with the county property appraiser by March 1 of the year after you buy. The exemption takes up to $50,000 off your home’s assessed value, and the Save Our Homes cap then limits how much the assessed value can rise each year to 3% or the rate of inflation, whichever is lower.',
        'Budget for taxes based on your purchase price, not the seller’s current bill. When a home sells, its assessed value resets to market value, so the seller’s tax bill, often lowered by years of their own homestead cap, usually isn’t what you’ll pay.',
      ],
    },
    {
      heading: 'From pre-approval to closing',
      blocks: [
        {
          steps: [
            'Get pre-approved. A lender reviews your credit, income and assets and tells you how much you can borrow. Sellers take pre-approved offers more seriously.',
            'Shop with a real budget that includes taxes, insurance and HOA dues, not just the loan payment.',
            'Make an offer and schedule inspections, including the insurance inspections older homes may need.',
            'Lock your rate and complete underwriting. Avoid opening new credit or making large unexplained deposits until closing.',
            'Close. In Florida, closings are handled by a title company or real estate attorney.',
          ],
        },
      ],
    },
  ],
  faqs: [
    {
      q: 'What credit score do I need to buy a home?',
      a: 'Conventional loans generally require a score of 620 or higher. FHA allows 580 with 3.5% down, and in some cases lower scores with 10% down. A higher score gets better pricing, so it can pay to improve your score before you apply.',
    },
    {
      q: 'Who counts as a first-time homebuyer?',
      a: 'For most programs, anyone who hasn’t owned a home in the past three years. You may qualify again even if you owned a home before.',
    },
    {
      q: 'What’s the difference between pre-qualification and pre-approval?',
      a: 'Pre-qualification is a quick estimate based on what you tell a lender. Pre-approval means the lender has checked your credit and reviewed documents like pay stubs, W-2s and bank statements. Sellers in competitive South Florida markets expect a pre-approval.',
    },
    {
      q: 'Can I use gift money for my down payment?',
      a: 'Yes. Conventional, FHA and VA loans allow gifts from family members, documented with a signed gift letter and a record of the transfer. The rules vary by program and property type.',
    },
    {
      q: 'How long does it take to close on a home?',
      a: 'About 30 to 45 days from an accepted offer is typical. Condos can take longer if the lender needs to review the building.',
    },
  ],
  related: ['/mortgage-calculator', '/condo-loans', '/refinance'],
}

const condoLoans: Topic = {
  slug: '/condo-loans',
  navLabel: 'Condos',
  footerLabel: 'South Florida condo loans',
  cardTitle: 'Condo financing',
  cardDesc: 'Warrantable vs. non-warrantable buildings, Florida’s post-Surfside rules, and your options.',
  title: 'South Florida Condo Loans: Warrantable, Non-Warrantable & FHA',
  description:
    'How lenders review condo buildings, what Florida’s post-Surfside inspection and reserve laws mean for buyers, and your options when a building doesn’t qualify.',
  eyebrow: 'Condo financing · Boca Raton & South Florida',
  h1: 'Financing a South Florida condo starts with the building.',
  intro:
    'When you finance a condo, the lender approves the building as well as you. Since the Surfside collapse in 2021, Florida’s inspection and reserve laws and stricter lender reviews have made that part of the process matter more than ever. Knowing where a building stands before you make an offer can save you weeks, and your deposit.',
  chatPrompt:
    'I’m looking at a condo in South Florida. What should I check about the building before I make an offer, and what loan options do I have?',
  ctaLabel: 'Ask about a condo',
  serviceType: 'Condominium mortgage',
  highlights: [
    {
      title: 'Warrantable or not',
      desc: 'Whether the building meets Fannie Mae and Freddie Mac standards decides which loans you can use.',
    },
    {
      title: 'Reserves and repairs',
      desc: 'Structural reports, reserves and special assessments now weigh heavily in a lender’s review.',
    },
    {
      title: 'Options either way',
      desc: 'Buildings that don’t meet agency standards can still be financed, usually with more down.',
    },
  ],
  sections: [
    {
      heading: 'Why condo loans are different',
      blocks: [
        'With a house, the lender mainly evaluates you and the property. With a condo, it also reviews the association: its budget, reserves, insurance, any litigation, and how many units are owner-occupied, rented or held by a single owner. The association answers these questions in a condo questionnaire, and the lender uses the answers to decide whether the building is eligible.',
      ],
    },
    {
      heading: 'Warrantable vs. non-warrantable',
      blocks: [
        'A warrantable condo is in a building that meets Fannie Mae and Freddie Mac guidelines, so it qualifies for standard conventional loans with the best pricing. Common reasons a building is non-warrantable:',
        {
          list: [
            'Underfunded reserves',
            'Critical structural repairs or significant deferred maintenance that haven’t been completed',
            'Large special assessments for safety or structural work',
            'Pending litigation involving the association',
            'One person or entity owning too many units',
            'Too much commercial space, or hotel-style operations such as a rental desk or short-term rental pool',
            'Inadequate master insurance coverage',
          ],
        },
      ],
    },
    {
      heading: 'Florida’s post-Surfside laws',
      blocks: [
        'After the Champlain Towers South collapse in Surfside in 2021, Florida passed laws that changed how condominium buildings are inspected and funded:',
        {
          list: [
            'Milestone inspections: condo buildings three stories or taller must have structural inspections once they reach set age thresholds, then again every 10 years.',
            'Structural integrity reserve studies: associations must study and fund reserves for key components such as the roof, structure, fireproofing, plumbing, electrical systems and waterproofing. Owners can no longer vote to waive or underfund those reserves.',
            'Disclosure: buyers are entitled to the inspection reports and reserve studies.',
          ],
        },
        'Many associations have raised dues sharply or levied special assessments to comply. Fannie Mae and Freddie Mac also won’t buy loans in buildings with unresolved critical repairs, so a building’s eligibility can change once work is finished.',
      ],
    },
    {
      heading: 'Your options when a building doesn’t qualify',
      blocks: [
        {
          list: [
            'Non-warrantable condo loans: portfolio and non-QM lenders finance buildings that don’t meet agency standards, typically with a larger down payment, often 20% or more, and a somewhat higher rate.',
            'FHA or VA: these programs keep their own lists of approved condo projects, and FHA can sometimes approve a single unit in a building that isn’t on the list.',
            'Cash now, refinance later: some buyers pay cash and [refinance](/refinance) once the building finishes its repairs and becomes eligible again.',
            'Walking away: if the reports show major work ahead with no plan to pay for it, the right loan may be no loan.',
          ],
        },
      ],
    },
    {
      heading: 'What to ask for before you make an offer',
      blocks: [
        {
          list: [
            'The latest milestone inspection report and structural integrity reserve study',
            'The current budget, reserve balance and any planned dues increases',
            'Special assessments, approved or under discussion',
            'Any litigation involving the association',
            'Rental rules, minimum lease terms, and the share of units that are rented',
            'The master insurance policy, and what your own HO-6 policy needs to cover',
          ],
        },
        'A lender who works South Florida condos can often tell you quickly whether a building has come up before. Ask before you write an offer, not after.',
      ],
    },
    {
      heading: '55+ communities and second homes',
      blocks: [
        'Age-restricted communities are financed like any other condo if the building qualifies. If you’re buying a seasonal home, a second-home loan usually has better terms than an investment property loan, as long as you use the unit yourself and don’t rely on renting it full time. Planning to rent it out? See [investment property loans](/investors).',
      ],
    },
  ],
  faqs: [
    {
      q: 'What is a non-warrantable condo?',
      a: 'A condo in a building that doesn’t meet Fannie Mae and Freddie Mac guidelines, often because of low reserves, structural repairs, litigation, too many units owned by one entity, or hotel-style operations. It can still be financed, usually through a portfolio or non-QM loan with a larger down payment.',
    },
    {
      q: 'Can I get an FHA loan on a condo?',
      a: 'Yes, if the building is on FHA’s approved list, or in some cases through a single-unit approval for a building that isn’t. FHA has its own requirements for owner occupancy, insurance and reserves, so not every building qualifies.',
    },
    {
      q: 'Do special assessments affect my mortgage approval?',
      a: 'They can. Lenders count your share of an assessment in your monthly debts, and large assessments for structural or safety work can make a building ineligible for some loans until the work is done.',
    },
    {
      q: 'Why would a lender turn down a building I like?',
      a: 'Usually because of reserves, structural repairs, litigation, investor or single-owner concentration, or insurance. The condo questionnaire and the association’s reports show which one. Some issues are resolved in months, others take years.',
    },
    {
      q: 'How much do I need to put down on a condo?',
      a: 'For a warrantable condo you’ll live in, generally the same down payment options as a house. For a non-warrantable condo, expect a larger down payment, often 20% or more. Investment condos require more down than primary residences.',
    },
  ],
  related: ['/first-time-homebuyer', '/investors', '/mortgage-calculator'],
}

const investors: Topic = {
  slug: '/investors',
  navLabel: 'Investors',
  footerLabel: 'Investment property & cost segregation',
  cardTitle: 'Investors & cost segregation',
  cardDesc: 'DSCR and conventional rental loans, plus how cost segregation accelerates depreciation.',
  title: 'Investment Property Loans & Cost Segregation in South Florida',
  description:
    'DSCR and conventional loans for rental property, plus how a cost segregation study can accelerate depreciation. A guide for South Florida real estate investors.',
  eyebrow: 'Real estate investors · South Florida',
  h1: 'Finance the property. Then keep more of what it earns.',
  intro:
    'Investing in South Florida real estate comes down to two questions: how you’ll finance the property, and how much of its income you keep after taxes. Boca Banker helps with both, from DSCR and conventional investment loans to cost segregation studies that speed up depreciation.',
  chatPrompt:
    'I own or am buying an investment property. What are my financing options, and how much could a cost segregation study save me?',
  ctaLabel: 'Estimate my savings',
  serviceType: 'Investment property financing and cost segregation',
  highlights: [
    {
      title: 'Qualify on rent',
      desc: 'DSCR loans qualify on the property’s rental income instead of your tax returns.',
    },
    {
      title: 'Accelerate depreciation',
      desc: 'Cost segregation can move a large share of a building’s cost into the first years of ownership.',
    },
    {
      title: 'Plan them together',
      desc: 'Financing and tax strategy work better when they’re decided at the same time.',
    },
  ],
  sections: [
    {
      heading: 'Conventional investment property loans',
      blocks: [
        'If your income is easy to document, a conventional loan usually offers the best pricing on a rental. Expect a larger down payment than for a home you live in, commonly 15% to 25% depending on the number of units, plus cash reserves. Fannie Mae allows up to 10 financed properties per borrower.',
      ],
    },
    {
      heading: 'DSCR loans',
      blocks: [
        'A debt service coverage ratio (DSCR) loan qualifies you on the property’s rent instead of your personal income. The lender divides the monthly rent by the full monthly payment, including taxes, insurance and any HOA dues. A ratio of 1.0 means the rent exactly covers the payment, and many lenders look for 1.0 to 1.25 or higher.',
        {
          list: [
            'Usually no tax returns or pay stubs, which helps self-employed investors and anyone with large write-offs',
            'Can close in an LLC',
            'Typically 20% to 25% down',
            'Higher rates than conventional, and many DSCR loans carry a prepayment penalty for the first few years',
          ],
        },
        'In South Florida, high insurance and HOA costs can push the ratio below 1.0 on properties that look fine on rent alone. Run the full payment before you commit.',
      ],
    },
    {
      heading: 'Short-term rentals',
      blocks: [
        'Some lenders will qualify a vacation rental on its projected short-term income. Check the local rules first: many South Florida cities and most condo associations restrict short-term rentals or set minimum lease terms. See [condo financing](/condo-loans) for how rental rules affect a building’s eligibility.',
      ],
    },
    {
      heading: 'What cost segregation does',
      blocks: [
        'Residential rental property normally depreciates over 27.5 years, and commercial property over 39. A cost segregation study, prepared by engineers and tax specialists, identifies the parts of a building that qualify for shorter lives: 5 or 7 years for items like appliances, carpeting, cabinetry and some electrical work, and 15 years for land improvements like parking, landscaping, fencing and pools.',
        'Typically 15% to 40% of a property’s depreciable basis can be moved into those shorter lives. With bonus depreciation, restored to 100% for property acquired after January 19, 2025, much of that can be deducted in the first year.',
        {
          note: 'Example: on a rental building with a $1,000,000 depreciable basis, reclassifying 25% moves $250,000 of deductions into the early years instead of spreading it over 27.5 years. Your actual tax savings depend on your bracket and whether you can use the losses.',
        },
      ],
    },
    {
      heading: 'Who benefits most',
      blocks: [
        {
          list: [
            'Owners of residential rentals, multifamily, retail, office, industrial or hospitality property, typically with a depreciable basis of $500,000 or more',
            'Investors who recently bought, built or renovated a property',
            'Owners of property placed in service in earlier years: a “look-back” study can catch up missed depreciation on your current return without amending prior years',
            'Real estate professionals, and investors who materially participate in short-term rentals, who can use rental losses against other income',
          ],
        },
        'Rental losses are generally passive. If you don’t qualify for one of the exceptions above, the extra depreciation may carry forward instead of lowering this year’s taxes. Depreciation is also subject to recapture when you sell. Review any study with your CPA before you order it.',
      ],
    },
  ],
  faqs: [
    {
      q: 'What is a DSCR loan?',
      a: 'A loan for investment property that qualifies you on the property’s rental income rather than your personal income. The lender compares the rent to the full monthly payment, including taxes, insurance and HOA dues. It’s popular with self-employed investors and anyone whose tax returns understate their income.',
    },
    {
      q: 'Can I buy an investment property in an LLC?',
      a: 'Yes, with a DSCR or other business-purpose loan. Conventional loans generally have to close in your personal name. Talk with your attorney and lender before transferring a property into an LLC after closing.',
    },
    {
      q: 'How much can a cost segregation study save?',
      a: 'Typically 15% to 40% of a property’s depreciable basis can be accelerated into the first few years. On a $1M basis, that’s roughly $150,000 to $400,000 in accelerated deductions. The chat can give you a quick estimate for your property.',
    },
    {
      q: 'Is cost segregation worth it on a smaller property?',
      a: 'Below roughly $500,000 in depreciable basis, the cost of a full engineering study can outweigh the benefit, though smaller-scale studies exist. Get an estimate of the accelerated deductions before you spend anything.',
    },
    {
      q: 'Does cost segregation cause problems when I sell?',
      a: 'Accelerated depreciation is subject to depreciation recapture at sale, which can raise the tax due. Many investors still come out ahead because of the value of taking deductions earlier, and a 1031 exchange can defer the tax. Plan it with your CPA.',
    },
  ],
  related: ['/refinance', '/condo-loans', '/mortgage-calculator'],
}

const mortgageCalculator: Topic = {
  slug: '/mortgage-calculator',
  navLabel: 'Calculator',
  footerLabel: 'Florida mortgage calculator',
  cardTitle: 'Florida mortgage calculator',
  cardDesc: 'Your full monthly payment with property taxes, insurance, HOA dues and mortgage insurance.',
  title: 'Florida Mortgage Calculator with Taxes, Insurance & HOA',
  description:
    'Estimate your full monthly payment in Boca Raton and South Florida, including property taxes, homeowners and flood insurance, HOA dues and mortgage insurance.',
  eyebrow: 'Mortgage calculator · Florida',
  h1: 'What will a South Florida home really cost each month?',
  intro:
    'Most mortgage calculators stop at principal and interest. In South Florida, taxes, insurance and HOA dues can add almost as much as the loan itself, so this one includes all of them.',
  chatPrompt:
    'Can you help me estimate my monthly payment on a home in South Florida, including taxes, insurance and HOA dues?',
  ctaLabel: 'Get a personalized estimate',
  sections: [
    {
      heading: 'What’s in your monthly payment',
      blocks: [
        {
          list: [
            'Principal and interest: the loan payment itself, based on the loan amount, rate and term.',
            'Property taxes: in Palm Beach and Broward counties, combined rates commonly work out to roughly 1.5% to 2% of a home’s value per year before the homestead exemption. Check the actual millage for the address.',
            'Homeowners insurance: often several thousand dollars a year in South Florida, depending on the home’s age, roof, windows and distance from the coast.',
            'Flood insurance: required in a special flood hazard area and optional elsewhere.',
            'HOA or condo dues: common in South Florida, and lenders count them.',
            'Mortgage insurance: PMI on conventional loans with less than 20% down, or FHA’s upfront and annual mortgage insurance premiums.',
          ],
        },
      ],
    },
    {
      heading: 'How to use your estimate',
      blocks: [
        'Lenders compare your total monthly housing payment and other debts to your gross monthly income. Approvals are simplest when housing stays near 28% of income and total debts stay under roughly 36% to 45%, though many programs allow more. If the number looks tight, try a larger down payment, a lower price, or a building with lower dues.',
        'The default rate is the Freddie Mac national weekly average for a 30-year fixed loan, not a quote. Your actual rate depends on your credit, down payment, property type and loan program. Buying your first home? Start with the [first-time homebuyer guide](/first-time-homebuyer).',
      ],
    },
  ],
  faqs: [
    {
      q: 'How much are property taxes in Boca Raton?',
      a: 'It depends on the address. A Boca Raton home is taxed by Palm Beach County, the school district, the city if it’s inside city limits, and several special districts. Combined, that’s commonly about 1.5% to 2% of assessed value. The homestead exemption and Save Our Homes cap lower the bill once you live in the home.',
    },
    {
      q: 'Why is homeowners insurance so expensive in South Florida?',
      a: 'Hurricane risk, high rebuilding costs and a tight insurance market. A newer roof, impact windows or shutters, and a wind mitigation inspection can noticeably lower your premium.',
    },
    {
      q: 'When does PMI go away?',
      a: 'On a conventional loan, you can ask to cancel PMI once your balance reaches 80% of the home’s original value, and it ends automatically at 78%. FHA mortgage insurance usually lasts the life of the loan if you put less than 10% down.',
    },
    {
      q: 'Is this calculator a loan quote?',
      a: 'No. It’s an estimate for planning. For numbers based on your own situation, ask in the chat or talk with Boca Banker directly.',
    },
  ],
  related: ['/first-time-homebuyer', '/refinance', '/condo-loans'],
}

export const topics: Topic[] = [
  firstTimeHomebuyer,
  refinance,
  condoLoans,
  investors,
  mortgageCalculator,
]

export function getTopic(slug: string): Topic {
  const topic = topics.find((t) => t.slug === slug)
  if (!topic) throw new Error(`Unknown topic: ${slug}`)
  return topic
}

/** Nav/footer order. */
export const topicLinks = topics.map(({ slug, navLabel, footerLabel }) => ({
  slug,
  navLabel,
  footerLabel,
}))
