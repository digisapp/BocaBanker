/**
 * Shared TypeScript types for Boca Banker
 */

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
  propertyType:
    | 'commercial'
    | 'residential'
    | 'mixed-use'
    | 'industrial'
    | 'retail'
    | 'hospitality'
    | 'healthcare'
    | 'multifamily';
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
