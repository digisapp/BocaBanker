'use client';

import { Calculator, DollarSign, Zap } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DepreciationCalculator from '@/components/calculators/DepreciationCalculator';
import TaxSavingsCalculator from '@/components/calculators/TaxSavingsCalculator';
import BonusDepreciationCalculator from '@/components/calculators/BonusDepreciationCalculator';

export default function CalculatorsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-serif font-bold text-gold-gradient">
          Cost Segregation Calculators
        </h1>
        <p className="text-[#94A3B8] mt-1">
          Model depreciation schedules, estimate tax savings, and analyze bonus
          depreciation opportunities
        </p>
      </div>

      {/* Calculator Tabs */}
      <Tabs defaultValue="depreciation" className="w-full">
        <TabsList className="bg-[#1A2B45] border border-[rgba(201,168,76,0.15)] p-1 h-auto flex-wrap">
          <TabsTrigger
            value="depreciation"
            className="data-[state=active]:bg-[#C9A84C] data-[state=active]:text-[#0F1B2D] text-[#94A3B8] gap-2 px-4 py-2"
          >
            <Calculator className="h-4 w-4" />
            Depreciation
          </TabsTrigger>
          <TabsTrigger
            value="tax-savings"
            className="data-[state=active]:bg-[#C9A84C] data-[state=active]:text-[#0F1B2D] text-[#94A3B8] gap-2 px-4 py-2"
          >
            <DollarSign className="h-4 w-4" />
            Tax Savings
          </TabsTrigger>
          <TabsTrigger
            value="bonus"
            className="data-[state=active]:bg-[#C9A84C] data-[state=active]:text-[#0F1B2D] text-[#94A3B8] gap-2 px-4 py-2"
          >
            <Zap className="h-4 w-4" />
            Bonus Depreciation
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
      </Tabs>
    </div>
  );
}
