'use client';

import { Calculator, DollarSign, Zap, Home, ArrowRightLeft, Landmark, Activity } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DepreciationCalculator from '@/components/calculators/DepreciationCalculator';
import TaxSavingsCalculator from '@/components/calculators/TaxSavingsCalculator';
import BonusDepreciationCalculator from '@/components/calculators/BonusDepreciationCalculator';
import MortgageCalculator from '@/components/calculators/MortgageCalculator';
import RefinanceAnalyzer from '@/components/calculators/RefinanceAnalyzer';
import DSCRCalculator from '@/components/calculators/DSCRCalculator';
import RateSensitivityTool from '@/components/calculators/RateSensitivityTool';

export default function CalculatorsPage() {
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
      <Tabs defaultValue="depreciation" className="w-full">
        <TabsList className="bg-gray-100 border border-gray-200 p-1 h-auto flex-wrap">
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
        </TabsList>

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
          <MortgageCalculator />
        </TabsContent>

        <TabsContent value="refinance" className="mt-6">
          <RefinanceAnalyzer />
        </TabsContent>

        <TabsContent value="dscr" className="mt-6">
          <DSCRCalculator />
        </TabsContent>

        <TabsContent value="rate-sensitivity" className="mt-6">
          <RateSensitivityTool />
        </TabsContent>
      </Tabs>
    </div>
  );
}
