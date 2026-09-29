'use client'

import { useRouter } from 'next/navigation'
import { FileSpreadsheet } from 'lucide-react'
import { CsvImporter } from '@/components/clients/CsvImporter'
import PageHeader from '@/components/shared/PageHeader'

export default function ImportClientsPage() {
  const router = useRouter()

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Header */}
      <PageHeader
        icon={FileSpreadsheet}
        title="Import Clients"
        description="Upload a CSV file to bulk import clients"
        onBack={() => router.back()}
      />

      {/* CSV Importer */}
      <CsvImporter />
    </div>
  )
}
