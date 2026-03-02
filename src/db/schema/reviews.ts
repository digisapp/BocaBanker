import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  date,
  timestamp,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const reviews = pgTable('reviews', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  // Reviewer info
  reviewerName: text('reviewer_name').notNull(),
  reviewerEmail: text('reviewer_email'),
  reviewerCity: text('reviewer_city'),
  reviewerState: text('reviewer_state'),

  // Review content
  rating: integer('rating').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),

  // Loan details (all optional)
  loanStatus: text('loan_status'),
  loanType: text('loan_type'),
  interestRateExperience: text('interest_rate_experience'),
  closedOnTime: boolean('closed_on_time'),
  feesExperience: text('fees_experience'),
  loanTerm: text('loan_term'),
  loanProgram: text('loan_program'),
  isFirstTimeBuyer: boolean('is_first_time_buyer'),
  isSelfEmployed: boolean('is_self_employed'),

  // Moderation
  status: text('status', {
    enum: ['pending', 'approved', 'rejected'],
  }).default('pending'),
  responseText: text('response_text'),
  responseDate: timestamp('response_date'),

  // Dates
  reviewDate: date('review_date'),
  createdAt: timestamp('created_at').default(sql`now()`),
  updatedAt: timestamp('updated_at').default(sql`now()`),
})
