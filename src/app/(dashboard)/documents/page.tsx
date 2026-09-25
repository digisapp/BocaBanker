'use client';

import { useEffect, useState, useCallback } from 'react';
import { logger } from '@/lib/logger';
import {
  Upload,
  FileText,
  Download,
  Trash2,
  Loader2,
  CloudUpload,
  File,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import EmptyState from '@/components/shared/EmptyState';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DocumentEntry {
  id: string;
  fileName: string;
  fileType: string | null;
  fileSize: number | null;
  storagePath: string;
  createdAt: string;
  clientId: string | null;
  studyId: string | null;
  clientName: string | null;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '--';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDocDate(value: string): string {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function fileTypeLabel(mime: string | null): string {
  if (!mime) return '--';
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
  };
  return map[mime] ?? mime.split('/')[1]?.toUpperCase() ?? '--';
}

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export default function DocumentsPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [docs, setDocs] = useState<DocumentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Key on the id: token refreshes emit a new User object and would refetch
  const userId = user?.id;
  const fetchDocuments = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/documents');
      if (res.ok) {
        const data = await res.json();
        setDocs(data.documents || []);
      } else {
        toast.error('Failed to load documents');
      }
    } catch (err) {
      logger.error('documents-page', 'Failed to fetch documents', err);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0 || !user) return;

    setUploading(true);
    let successCount = 0;

    for (const file of Array.from(files)) {
      // Reject oversize files before uploading — the API refuses >50 MB and
      // would otherwise leave the uploaded object orphaned in storage
      if (file.size > MAX_UPLOAD_BYTES) {
        toast.error(`${file.name} exceeds the 50 MB limit`);
        continue;
      }
      const filePath = `${user.id}/${Date.now()}-${file.name}`;

      try {
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (uploadError) {
          logger.error('documents-page', 'Upload error', uploadError);
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        const res = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            storagePath: filePath,
          }),
        });

        if (res.ok) {
          successCount++;
        } else {
          const data = await res.json().catch(() => ({}));
          logger.error('documents-page', 'Failed to save document record', data);
          toast.error(data.error || `Failed to save ${file.name}`);
          // Don't leave an untracked file behind in storage
          await supabase.storage.from('documents').remove([filePath]);
        }
      } catch (err) {
        logger.error('documents-page', 'Upload failed', err);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setUploading(false);

    if (successCount > 0) {
      toast.success(`${successCount} file${successCount > 1 ? 's' : ''} uploaded`);
      fetchDocuments();
    }
  }

  async function handleDownload(doc: DocumentEntry) {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(doc.storagePath);

      if (error) {
        logger.error('documents-page', 'Download error', error);
        toast.error('Failed to download file');
        return;
      }

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      logger.error('documents-page', 'Download failed', err);
      toast.error('Failed to download file');
    }
  }

  async function handleDelete(doc: DocumentEntry) {
    if (!confirm(`Delete "${doc.fileName}"? This cannot be undone.`)) return;

    setDeletingId(doc.id);
    try {
      const res = await fetch(`/api/documents/${doc.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Document deleted');
        setDocs((prev) => prev.filter((d) => d.id !== doc.id));
      } else {
        toast.error('Failed to delete document');
      }
    } catch (err) {
      logger.error('documents-page', 'Delete failed', err);
      toast.error('Failed to delete document');
    } finally {
      setDeletingId(null);
    }
  }

  // Download/delete buttons, shared by the desktop table and the mobile card list
  function renderDocumentActions(doc: DocumentEntry, buttonClassName?: string) {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleDownload(doc)}
          className={cn('text-amber-600 hover:text-amber-700 hover:bg-amber-50', buttonClassName)}
          title="Download"
          aria-label={`Download ${doc.fileName}`}
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleDelete(doc)}
          disabled={deletingId === doc.id}
          className={cn('text-red-400 hover:text-red-600 hover:bg-red-50', buttonClassName)}
          title="Delete"
          aria-label={`Delete ${doc.fileName}`}
        >
          {deletingId === doc.id ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-serif font-bold text-amber-600">Documents</h1>
        <p className="text-gray-500 mt-1">
          Upload and manage documents for your clients and studies
        </p>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }}
        className={`bg-white rounded-2xl border-2 border-dashed transition-all duration-200 ${
          dragOver ? 'border-amber-500 bg-amber-50/50' : 'border-gray-200'
        }`}
      >
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          {uploading ? (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-amber-500 mb-3" />
              <p className="text-gray-900 font-medium">Uploading...</p>
            </>
          ) : (
            <>
              <CloudUpload className="h-10 w-10 text-amber-500 mb-3" />
              <p className="text-gray-900 font-medium mb-1">Drag and drop files here</p>
              <p className="text-sm text-gray-400 mb-4">
                PDF, Word, Excel, CSV, or images up to 50 MB
              </p>
              <label>
                <Button
                  asChild
                  className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:opacity-90 font-semibold cursor-pointer"
                >
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Choose Files
                  </span>
                </Button>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={(e) => handleUpload(e.target.files)}
                />
              </label>
            </>
          )}
        </div>
      </div>

      {/* Documents Table */}
      {loading ? (
        <LoadingSpinner text="Loading documents..." />
      ) : docs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No Documents Yet"
          description="Upload your first document to get started. You can store reports, tax documents, and property files."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          {/* Mobile card list: the 6-column table only scrolls sideways on a phone */}
          <div className="md:hidden divide-y divide-gray-100">
            {docs.map((doc) => (
              <div key={doc.id} className="p-4">
                <div className="flex items-start gap-3">
                  <File className="h-4 w-4 text-amber-600 flex-shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {doc.fileName}
                    </p>
                    <p className="text-sm text-gray-700 truncate">
                      {doc.clientName ?? <span className="text-gray-400">No client</span>}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {formatFileSize(doc.fileSize)} · {formatDocDate(doc.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Badge
                    variant="outline"
                    className="bg-gray-50 text-gray-600 border-gray-200 text-xs"
                  >
                    {fileTypeLabel(doc.fileType)}
                  </Badge>
                  <div className="ml-auto flex items-center gap-2">
                    {renderDocumentActions(doc, 'size-10 border border-gray-200')}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 hover:bg-transparent">
                  <TableHead className="text-amber-600">Name</TableHead>
                  <TableHead className="text-amber-600">Type</TableHead>
                  <TableHead className="text-amber-600">Size</TableHead>
                  <TableHead className="text-amber-600">Client</TableHead>
                  <TableHead className="text-amber-600">Date</TableHead>
                  <TableHead className="text-amber-600 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((doc) => (
                  <TableRow key={doc.id} className="border-gray-100 hover:bg-amber-50/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <File className="h-4 w-4 text-amber-600 flex-shrink-0" />
                        <span className="text-gray-900 text-sm truncate max-w-[220px]">
                          {doc.fileName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {fileTypeLabel(doc.fileType)}
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {formatFileSize(doc.fileSize)}
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {doc.clientName ?? <span className="text-gray-300">—</span>}
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm whitespace-nowrap">
                      {formatDocDate(doc.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {renderDocumentActions(doc)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
