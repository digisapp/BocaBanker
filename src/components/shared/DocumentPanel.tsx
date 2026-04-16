'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Upload,
  File,
  Download,
  Trash2,
  Loader2,
  FileText,
  CloudUpload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'

interface DocumentEntry {
  id: string
  fileName: string
  fileType: string | null
  fileSize: number | null
  storagePath: string
  createdAt: string
}

interface DocumentPanelProps {
  clientId?: string
  studyId?: string
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '--'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileTypeLabel(mime: string | null): string {
  if (!mime) return 'File'
  const map: Record<string, string> = {
    'application/pdf': 'PDF',
    'application/msword': 'Word',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
    'application/vnd.ms-excel': 'Excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
    'image/jpeg': 'Image',
    'image/png': 'Image',
    'image/webp': 'Image',
    'text/csv': 'CSV',
    'text/plain': 'Text',
  }
  return map[mime] ?? mime.split('/')[1]?.toUpperCase() ?? 'File'
}

export default function DocumentPanel({ clientId, studyId }: DocumentPanelProps) {
  const { user } = useAuth()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [docs, setDocs] = useState<DocumentEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (clientId) params.set('clientId', clientId)
      if (studyId) params.set('studyId', studyId)
      const res = await fetch(`/api/documents?${params}`)
      if (res.ok) {
        const data = await res.json()
        setDocs(data.documents || [])
      }
    } catch (err) {
      logger.error('document-panel', 'Failed to fetch documents', err)
    } finally {
      setLoading(false)
    }
  }, [clientId, studyId])

  useEffect(() => {
    fetchDocs()
  }, [fetchDocs])

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0 || !user) return
    setUploading(true)
    let successCount = 0

    for (const file of Array.from(files)) {
      const filePath = `${user.id}/${Date.now()}-${file.name}`
      try {
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file)

        if (uploadError) {
          toast.error(`Failed to upload ${file.name}`)
          logger.error('document-panel', 'Storage upload error', uploadError)
          continue
        }

        const res = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            storagePath: filePath,
            clientId: clientId ?? null,
            studyId: studyId ?? null,
          }),
        })

        if (res.ok) {
          successCount++
        }
      } catch (err) {
        logger.error('document-panel', 'Upload failed', err)
        toast.error(`Failed to upload ${file.name}`)
      }
    }

    setUploading(false)
    if (successCount > 0) {
      toast.success(`${successCount} file${successCount > 1 ? 's' : ''} uploaded`)
      fetchDocs()
    }
  }

  async function handleDownload(doc: DocumentEntry) {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(doc.storagePath)

      if (error) {
        toast.error('Failed to download file')
        return
      }

      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      logger.error('document-panel', 'Download failed', err)
      toast.error('Failed to download file')
    }
  }

  async function handleDelete(doc: DocumentEntry) {
    if (!confirm(`Delete "${doc.fileName}"? This cannot be undone.`)) return
    setDeletingId(doc.id)
    try {
      const res = await fetch(`/api/documents/${doc.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Document deleted')
        setDocs((prev) => prev.filter((d) => d.id !== doc.id))
      } else {
        toast.error('Failed to delete document')
      }
    } catch (err) {
      logger.error('document-panel', 'Delete failed', err)
      toast.error('Failed to delete document')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={(e) => { e.preventDefault(); setDragOver(false) }}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          handleUpload(e.dataTransfer.files)
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`flex items-center justify-center gap-3 py-5 px-4 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
          dragOver
            ? 'border-amber-400 bg-amber-50/60'
            : 'border-gray-200 hover:border-amber-300 hover:bg-gray-50'
        }`}
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
            <span className="text-sm text-gray-500">Uploading...</span>
          </>
        ) : (
          <>
            <CloudUpload className="h-4 w-4 text-amber-500" />
            <span className="text-sm text-gray-500">
              Drop files or <span className="text-amber-600 font-medium">click to upload</span>
            </span>
            <Upload className="h-3 w-3 text-gray-400" />
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />
      </div>

      {/* Document list */}
      {loading ? (
        <div className="flex items-center gap-2 py-4 justify-center text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading...
        </div>
      ) : docs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <FileText className="h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-400">No documents attached yet</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100 hover:border-amber-200 group transition-colors"
            >
              <File className="h-4 w-4 text-amber-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 truncate">{doc.fileName}</p>
                <p className="text-xs text-gray-400">
                  {fileTypeLabel(doc.fileType)} · {formatFileSize(doc.fileSize)} ·{' '}
                  {new Date(doc.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(doc)}
                  className="h-7 w-7 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                  title="Download"
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(doc)}
                  disabled={deletingId === doc.id}
                  className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                  title="Delete"
                >
                  {deletingId === doc.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Trash2 className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
