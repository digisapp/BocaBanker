import {
  pgTable,
  uuid,
  text,
  numeric,
  integer,
  date,
  timestamp,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { users } from './users'

export const leads = pgTable('leads', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id),

  // Property info
  propertyAddress: text('property_address').notNull(),
  propertyCity: text('property_city'),
  propertyCounty: text('property_county'),
  propertyState: text('property_state').default('FL'),
  propertyZip: text('property_zip'),
  propertyType: text('property_type', {
    enum: [
      'industrial',
      'office',
      'retail',
      'multifamily',
      'mixed-use',
      'hospitality',
      'healthcare',
      'other',
    ],
  }).notNull(),

  // Transaction details
  salePrice: numeric('sale_price'),
  saleDate: date('sale_date'),
  parcelId: text('parcel_id'),
  deedBookPage: text('deed_book_page'),

  // Buyer / Owner info
  buyerName: text('buyer_name'),
  buyerCompany: text('buyer_company'),
  buyerEmail: text('buyer_email'),
  buyerPhone: text('buyer_phone'),

  // Seller info
  sellerName: text('seller_name'),

  // LLC member / registered agent (from Sunbiz)
  memberName: text('member_name'),
  memberAddress: text('member_address'),
  memberCity: text('member_city'),
  memberState: text('member_state'),
  memberZip: text('member_zip'),
  sunbizDocNumber: text('sunbiz_doc_number'),

  // Building details
  squareFootage: integer('square_footage'),
  yearBuilt: integer('year_built'),
  buildingValue: numeric('building_value'),
  landValue: numeric('land_value'),

  // Lead management
  status: text('status', {
    enum: ['new', 'contacted', 'qualified', 'proposal_sent', 'converted', 'lost'],
  }).default('new'),
  priority: text('priority', {
    enum: ['low', 'medium', 'high'],
  }).default('medium'),
  source: text('source'),
  notes: text('notes'),
  tags: text('tags')
    .array()
    .default(sql`'{}'::text[]`),

  // Tracking
  contactedAt: timestamp('contacted_at'),
  convertedClientId: uuid('converted_client_id'),
  createdAt: timestamp('created_at').default(sql`now()`),
  updatedAt: timestamp('updated_at').default(sql`now()`),
})

export const leadsRelations = relations(leads, ({ one }) => ({
  user: one(users, { fields: [leads.userId], references: [users.id] }),
}))
