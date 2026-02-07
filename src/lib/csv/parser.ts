import Papa from 'papaparse';

export function parseCSV(
  file: File
): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
      complete: (results) => {
        const headers = results.meta.fields ?? [];
        const rows = results.data as Record<string, string>[];
        resolve({ headers, rows });
      },
      error: (error: Error) => {
        reject(error);
      },
    });
  });
}

export function validateCSVData(
  rows: Record<string, string>[],
  requiredFields: string[]
): {
  valid: Record<string, string>[];
  errors: { row: number; message: string }[];
} {
  const valid: Record<string, string>[] = [];
  const errors: { row: number; message: string }[] = [];

  rows.forEach((row, index) => {
    const missingFields = requiredFields.filter(
      (field) => !row[field] || row[field].trim() === ''
    );

    if (missingFields.length > 0) {
      errors.push({
        row: index + 1,
        message: `Missing required fields: ${missingFields.join(', ')}`,
      });
    } else {
      valid.push(row);
    }
  });

  return { valid, errors };
}
