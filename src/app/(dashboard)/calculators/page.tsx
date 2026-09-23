'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Calculator, DollarSign, Zap, Home, ArrowRightLeft, Landmark, Activity, Sparkles, GitCompare } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import dynamic from 'next/dynamic';

// Each calculator pulls in recharts (~360KB). Radix Tabs only mounts the
// active TabsContent, so loading them lazily means only the active tab's
// calculator chunk is fetched.
function CalculatorSkeleton() {
  return <div className="h-[600px] w-full animate-pulse rounded-lg bg-gray-100" />;
}
const CombinedAnalyzer = dynamic(() => import('@/components/calculators/CombinedAnalyzer'), {
  ssr: false,
  loading: CalculatorSkeleton,
});
const DepreciationCalculator = dynamic(() => import('@/components/calculators/DepreciationCalculator'), {
  ssr: false,
  loading: CalculatorSkeleton,
});
const TaxSavingsCalculator = dynamic(() => import('@/components/calculators/TaxSavingsCalculator'), {
  ssr: false,
  loading: CalculatorSkeleton,
});
const BonusDepreciationCalculator = dynamic(() => import('@/components/calculators/BonusDepreciationCalculator'), {
  ssr: false,
  loading: CalculatorSkeleton,
});
const MortgageCalculator = dynamic(() => import('@/components/calculators/MortgageCalculator'), {
  ssr: false,
  loading: CalculatorSkeleton,
});
const RefinanceAnalyzer = dynamic(() => import('@/components/calculators/RefinanceAnalyzer'), {
  ssr: false,
  loading: CalculatorSkeleton,
});
const DSCRCalculator = dynamic(() => import('@/components/calculators/DSCRCalculator'), {
  ssr: false,
  loading: CalculatorSkeleton,
});
const RateSensitivityTool = dynamic(() => import('@/components/calculators/RateSensitivityTool'), {
  ssr: false,
  loading: CalculatorSkeleton,
});
const ScenarioCompareCalculator = dynamic(() => import('@/components/calculators/ScenarioCompareCalculator'), {
  ssr: false,
  loading: CalculatorSkeleton,
});

function CalculatorsContent() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'combined';

  // Collect all search params as initialValues (excluding 'tab')
  const initialValues: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    if (key !== 'tab') initialValues[key] = value;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-serif font-bold text-amber-600">
          Financial Calculators
        </h1>
        <p className="text-gray-500 mt-1">
          Cost segregation, depreciation, mortgage payments, and refinance analysis
        </p>
      </div>

      {/* Calculator Tabs */}
      <Tabs defaultValue={activeTab} className="w-full">
        <TabsList className="bg-gray-100 border border-gray-200 p-1 h-auto flex-wrap">
          <TabsTrigger
            value="combined"
            className="data-[state=active]:bg-amber-500 data-[state=active]:text-white text-gray-500 gap-2 px-4 py-2"
          >
            <Sparkles className="h-4 w-4" />
            Combined Analysis
          </TabsTrigger>
          <TabsTrigger
            value="depreciation"
            className="data-[state=active]:bg-amber-500 data-[state=active]:text-white text-gray-500 gap-2 px-4 py-2"
          >
            <Calculator className="h-4 w-4" />
            Depreciation
          </TabsTrigger>
          <TabsTrigger
            value="tax-savings"
            className="data-[state=active]:bg-amber-500 data-[state=active]:text-white text-gray-500 gap-2 px-4 py-2"
          >
            <DollarSign className="h-4 w-4" />
            Tax Savings
          </TabsTrigger>
          <TabsTrigger
            value="bonus"
            className="data-[state=active]:bg-amber-500 data-[state=active]:text-white text-gray-500 gap-2 px-4 py-2"
          >
            <Zap className="h-4 w-4" />
            Bonus Depreciation
          </TabsTrigger>
          <TabsTrigger
            value="mortgage"
            className="data-[state=active]:bg-amber-500 data-[state=active]:text-white text-gray-500 gap-2 px-4 py-2"
          >
            <Home className="h-4 w-4" />
            Mortgage
          </TabsTrigger>
          <TabsTrigger
            value="refinance"
            className="data-[state=active]:bg-amber-500 data-[state=active]:text-white text-gray-500 gap-2 px-4 py-2"
          >
            <ArrowRightLeft className="h-4 w-4" />
            Refinance
          </TabsTrigger>
          <TabsTrigger
            value="dscr"
            className="data-[state=active]:bg-amber-500 data-[state=active]:text-white text-gray-500 gap-2 px-4 py-2"
          >
            <Landmark className="h-4 w-4" />
            DSCR
          </TabsTrigger>
          <TabsTrigger
            value="rate-sensitivity"
            className="data-[state=active]:bg-amber-500 data-[state=active]:text-white text-gray-500 gap-2 px-4 py-2"
          >
            <Activity className="h-4 w-4" />
            Rate Sensitivity
          </TabsTrigger>
          <TabsTrigger
            value="scenario-compare"
            className="data-[state=active]:bg-amber-500 data-[state=active]:text-white text-gray-500 gap-2 px-4 py-2"
          >
            <GitCompare className="h-4 w-4" />
            Loan Comparison
          </TabsTrigger>
        </TabsList>

        <TabsContent value="combined" className="mt-6">
          <CombinedAnalyzer initialValues={initialValues} />
        </TabsContent>

        <TabsContent value="depreciation" className="mt-6">
          <DepreciationCalculator />
        </TabsContent>

        <TabsContent value="tax-savings" className="mt-6">
          <TaxSavingsCalculator />
        </TabsContent>

        <TabsContent value="bonus" className="mt-6">
          <BonusDepreciationCalculator />
        </TabsContent>

        <TabsContent value="mortgage" className="mt-6">
          <MortgageCalculator initialValues={initialValues} />
        </TabsContent>

        <TabsContent value="refinance" className="mt-6">
          <RefinanceAnalyzer initialValues={initialValues} />
        </TabsContent>

        <TabsContent value="dscr" className="mt-6">
          <DSCRCalculator initialValues={initialValues} />
        </TabsContent>

        <TabsContent value="rate-sensitivity" className="mt-6">
          <RateSensitivityTool initialValues={initialValues} />
        </TabsContent>

        <TabsContent value="scenario-compare" className="mt-6">
          <ScenarioCompareCalculator initialValues={initialValues} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function CalculatorsPage() {
  return (
    <Suspense>
      <CalculatorsContent />
    </Suspense>
  );
}
