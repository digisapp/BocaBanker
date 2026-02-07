'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, FileSpreadsheet } from 'lucide-react'
import { CsvImporter } from '@/components/clients/CsvImporter'
import { Button } from '@/components/ui/button'

export default function ImportClientsPage() {
  const router = useRouter()

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="text-muted-foreground hover:text-gold"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
            <FileSpreadsheet className="h-5 w-5 text-gold" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Import Clients
            </h1>
            <p className="text-sm text-muted-foreground">
              Upload a CSV file to bulk import clients
            </p>
          </div>
        </div>
      </div>

      {/* CSV Importer */}
      <CsvImporter />
    </div>
  )
}
