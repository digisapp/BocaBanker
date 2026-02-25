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

interface DocumentEntry {
  id: string;
  fileName: string;
  fileType: string | null;
  fileSize: number | null;
  storagePath: string;
  createdAt: string;
  clientId: string | null;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '--';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string | null): string {
  if (!type) return 'file';
  if (type.includes('pdf')) return 'pdf';
  if (type.includes('image')) return 'image';
  if (type.includes('spreadsheet') || type.includes('csv') || type.includes('excel'))
    return 'spreadsheet';
  return 'file';
}

export default function DocumentsPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [documents, setDocuments] = useState<DocumentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fetchDocuments = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch('/api/documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      logger.error('documents-page', 'Failed to fetch documents', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0 || !user) return;

    setUploading(true);

    for (const file of Array.from(files)) {
      const filePath = `${user.id}/${Date.now()}-${file.name}`;

      try {
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (uploadError) {
          logger.error('documents-page', 'Upload error', uploadError);
          continue;
        }

        // Save document record via API
        await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            storagePath: filePath,
          }),
        });
      } catch (err) {
        logger.error('documents-page', 'Upload failed', err);
      }
    }

    setUploading(false);
    fetchDocuments();
  }

  async function handleDownload(doc: DocumentEntry) {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(doc.storagePath);

      if (error) {
        logger.error('documents-page', 'Download error', error);
        return;
      }

      // Create a download link
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
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-serif font-bold text-amber-600">
          Documents
        </h1>
        <p className="text-gray-500 mt-1">
          Upload and manage documents for your clients and studies
        </p>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`bg-white rounded-2xl border-2 border-dashed transition-all duration-200 ${
          dragOver
            ? 'border-amber-500 bg-amber-50/50'
            : 'border-gray-200'
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
              <p className="text-gray-900 font-medium mb-1">
                Drag and drop files here
              </p>
              <p className="text-sm text-gray-400 mb-4">
                or click to browse
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
      ) : documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No Documents Yet"
          description="Upload your first document to get started. You can store reports, tax documents, and property files."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-200 hover:bg-transparent">
                <TableHead className="text-amber-600">Name</TableHead>
                <TableHead className="text-amber-600">Type</TableHead>
                <TableHead className="text-amber-600">Size</TableHead>
                <TableHead className="text-amber-600">Date</TableHead>
                <TableHead className="text-amber-600 text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow
                  key={doc.id}
                  className="border-gray-100 hover:bg-amber-50/50"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <File className="h-4 w-4 text-amber-600 flex-shrink-0" />
                      <span className="text-gray-900 text-sm truncate max-w-[200px]">
                        {doc.fileName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-500 text-sm">
                    {doc.fileType || '--'}
                  </TableCell>
                  <TableCell className="text-gray-500 text-sm">
                    {formatFileSize(doc.fileSize)}
                  </TableCell>
                  <TableCell className="text-gray-500 text-sm whitespace-nowrap">
                    {new Date(doc.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(doc)}
                      className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
