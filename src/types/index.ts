/**
 * Shared TypeScript types for Boca Banker
 */

import type { PropertyPropertyType, LeadPropertyType } from '@/constants/property-types'

// ---------------------------------------------------------------------------
// Database entity types
// ---------------------------------------------------------------------------

export interface Client {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: 'active' | 'prospect' | 'inactive';
  tags: string[];
  notes: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  source: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Property {
  id: string;
  clientId: string | null;
  userId: string;
  address: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  propertyType: PropertyPropertyType;
  purchasePrice: string;
  purchaseDate: string | null;
  buildingValue: string | null;
  landValue: string | null;
  squareFootage: number | null;
  yearBuilt: number | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CostSegStudy {
  id: string;
  propertyId: string | null;
  clientId: string | null;
  userId: string;
  studyName: string;
  status: 'draft' | 'in_progress' | 'completed';
  taxRate: string;
  discountRate: string | null;
  bonusDepreciationRate: string | null;
  studyYear: number;
  results: unknown;
  totalFirstYearDeduction: string | null;
  totalTaxSavings: string | null;
  npvTaxSavings: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudyAsset {
  id: string;
  studyId: string;
  assetName: string;
  assetCategory:
    | 'personal_property_5yr'
    | 'personal_property_7yr'
    | 'land_improvements_15yr'
    | 'building_27_5yr'
    | 'building_39yr'
    | 'land';
  recoveryPeriod: number;
  costBasis: string;
  depreciationMethod: string;
  bonusEligible: boolean;
  createdAt: string;
}

export interface ChatConversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export interface Document {
  id: string;
  userId: string;
  clientId: string | null;
  studyId: string | null;
  fileName: string;
  fileType: string | null;
  fileSize: number | null;
  storagePath: string;
  createdAt: string;
}

export interface EmailLog {
  id: string;
  userId: string;
  clientId: string | null;
  toEmail: string;
  subject: string;
  template: string | null;
  status: 'sent' | 'delivered' | 'bounced' | 'failed';
  resendId: string | null;
  sentAt: string;
}

export interface ReceivedEmail {
  id: string;
  userId: string | null;
  clientId: string | null;
  fromEmail: string;
  fromName: string | null;
  toEmail: string;
  subject: string;
  bodyHtml: string | null;
  bodyText: string | null;
  resendId: string | null;
  inReplyToResendId: string | null;
  isRead: boolean;
  receivedAt: string;
}

export interface Email {
  id: string;
  userId: string | null;
  clientId: string | null;
  direction: 'inbound' | 'outbound';
  fromEmail: string;
  fromName: string | null;
  toEmail: string;
  subject: string;
  bodyHtml: string | null;
  bodyText: string | null;
  template: string | null;
  status: 'sent' | 'delivered' | 'bounced' | 'failed' | 'received' | 'read' | 'replied';
  resendId: string | null;
  threadId: string | null;
  inReplyToId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface Lead {
  id: string;
  userId: string;
  propertyAddress: string;
  propertyCity: string | null;
  propertyCounty: string | null;
  propertyState: string | null;
  propertyZip: string | null;
  propertyType: LeadPropertyType;
  salePrice: string | null;
  saleDate: string | null;
  parcelId: string | null;
  deedBookPage: string | null;
  buyerName: string | null;
  buyerCompany: string | null;
  buyerEmail: string | null;
  buyerPhone: string | null;
  sellerName: string | null;
  squareFootage: number | null;
  yearBuilt: number | null;
  buildingValue: string | null;
  landValue: string | null;
  status:
    | 'new'
    | 'contacted'
    | 'qualified'
    | 'proposal_sent'
    | 'converted'
    | 'lost';
  priority: 'low' | 'medium' | 'high';
  source: string | null;
  notes: string | null;
  tags: string[];
  contactedAt: string | null;
  convertedClientId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface DashboardStats {
  totalClients: number;
  newClientsThisMonth: number;
  totalProperties: number;
  totalStudies: number;
  completedStudies: number;
  totalTaxSavings: number;
  emailsSentThisMonth: number;
  totalLeads: number;
  newLeads: number;
  contactedLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;
  newLeadsThisMonth: number;
  totalPortfolioValue: number;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'client' | 'property' | 'study' | 'email' | 'document';
  description: string;
  timestamp: string;
}

export interface MetricCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  change?: string;
}

// ---------------------------------------------------------------------------
// Cost Seg / Calculators
// ---------------------------------------------------------------------------

export interface StudyReport {
  summary: {
    totalReclassified: number;
    totalFirstYearDeduction: number;
    totalTaxSavings: number;
    npvTaxSavings: number;
    effectiveRate: number;
  };
  assetBreakdown: {
    category: string;
    amount: number;
    percentage: number;
    recoveryPeriod: number;
  }[];
  depreciationSchedule: {
    year: number;
    accelerated: number;
    straightLine: number;
    difference: number;
  }[];
  taxSavingsSchedule: {
    year: number;
    withCostSeg: number;
    withoutCostSeg: number;
    savings: number;
    cumulativeSavings: number;
  }[];
  firstYearAnalysis: {
    bonusDepreciation: number;
    regularFirstYear: number;
    totalFirstYear: number;
    taxSavings: number;
  };
}

export interface DepreciationScheduleItem {
  year: number;
  depreciation: number;
  cumulativeDepreciation: number;
  remainingBasis: number;
}

export interface TaxSavingsItem {
  year: number;
  withCostSeg: number;
  withoutCostSeg: number;
  annualSavings: number;
  cumulativeSavings: number;
}

// ---------------------------------------------------------------------------
// Mortgage / Loans
// ---------------------------------------------------------------------------

export interface Loan {
  id: string;
  userId: string;
  borrowerName: string;
  borrowerEmail: string | null;
  borrowerPhone: string | null;
  propertyAddress: string;
  propertyCity: string | null;
  propertyState: string | null;
  propertyZip: string | null;
  purchasePrice: string | null;
  loanAmount: string;
  loanType:
    | 'conventional'
    | 'fha'
    | 'va'
    | 'usda'
    | 'jumbo'
    | 'heloc'
    | 'commercial'
    | 'other';
  interestRate: string | null;
  term: number | null;
  status:
    | 'pre_qual'
    | 'application'
    | 'processing'
    | 'underwriting'
    | 'clear_to_close'
    | 'funded'
    | 'closed'
    | 'withdrawn';
  ariveLink: string | null;
  ariveLinkSentAt: string | null;
  estimatedClosingDate: string | null;
  actualClosingDate: string | null;
  commissionBps: number | null;
  commissionAmount: string | null;
  lenderId: string | null;
  lenderName: string | null;
  leadId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  id: string;
  userId: string;
  ariveLink: string | null;
  ariveCompanyName: string | null;
  rateAlertEnabled: boolean;
  rateAlertThresholdBps: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MortgageRate {
  id: string;
  weekOf: string;
  rate30yr: string | null;
  rate15yr: string | null;
  rate5arm: string | null;
  source: string;
  fetchedAt: string;
}

export interface MortgageDashboardStats {
  currentRate30yr: number | null;
  currentRate15yr: number | null;
  rateChange30yr: number | null;
  rateTrend: { weekOf: string; rate30yr: number; rate15yr: number }[];
  pipelineSummary: {
    preQual: number;
    application: number;
    processing: number;
    underwriting: number;
    clearToClose: number;
    total: number;
    totalVolume: number;
  };
  commissionMTD: number;
  commissionYTD: number;
  loansFundedMTD: number;
  loansFundedYTD: number;
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export interface Review {
  id: string;
  reviewerName: string;
  reviewerEmail: string | null;
  reviewerCity: string | null;
  reviewerState: string | null;
  rating: number;
  title: string;
  body: string;
  loanStatus: string | null;
  loanType: string | null;
  interestRateExperience: string | null;
  closedOnTime: boolean | null;
  feesExperience: string | null;
  loanTerm: string | null;
  loanProgram: string | null;
  isFirstTimeBuyer: boolean | null;
  isSelfEmployed: boolean | null;
  status: 'pending' | 'approved' | 'rejected';
  responseText: string | null;
  responseDate: string | null;
  reviewDate: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// CSV Import
// ---------------------------------------------------------------------------

export interface CSVImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: string[];
}

export interface ColumnMapping {
  csvColumn: string;
  dbField: string;
}
