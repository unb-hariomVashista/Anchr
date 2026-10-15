/** Minimal RFC 4180 CSV helpers shared by every import and export. */

export const MAX_CSV_BYTES = 1024 * 1024;

/** Parses CSV text into rows of cells. Handles quotes, escaped quotes, embedded newlines and a BOM. */
export function parseCsv(text: string): string[][] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      rows.push(row);
      row = [];
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** Turns parsed rows into objects keyed by the (trimmed) header row. Row numbers are 1-based file lines. */
export function csvRecords(text: string): { records: { line: number; values: Record<string, string> }[]; headers: string[] } {
  const [head, ...body] = parseCsv(text);
  const headers = (head ?? []).map((h) => h.trim());
  const records = body.map((cells, i) => ({
    line: i + 2,
    values: Object.fromEntries(headers.map((h, c) => [h, unguard((cells[c] ?? "").trim())])),
  }));
  return { records, headers };
}

/** Reverses the formula guard applied on export so round-trips are lossless. */
const unguard = (s: string) => (/^'[=+\-@\t\r]/.test(s) ? s.slice(1) : s);

/** Quotes a cell. Strings get a formula-injection guard; numbers and booleans are written as-is. */
export function csvCell(v: unknown): string {
  if (v == null) return '""';
  if (typeof v === "number" || typeof v === "boolean") return `"${v}"`;
  const s = v instanceof Date ? v.toISOString() : String(v);
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

export const toCsvRow = (values: unknown[]) => values.map(csvCell).join(",");

/**
 * Streams rows as CSV in batches. `fetchBatch(cursor)` returns the next rows plus the new cursor
 * (null/empty ends the stream).
 */
export function streamCsv<T>(
  columns: readonly string[],
  fetchBatch: (cursor: string | null) => Promise<{ rows: T[]; cursor: string | null }>,
  toValues: (row: T) => unknown[],
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let cursor: string | null = null;
  let started = false;

  return new ReadableStream({
    async pull(controller) {
      if (!started) {
        started = true;
        controller.enqueue(encoder.encode(columns.join(",") + "\n"));
      }
      const batch = await fetchBatch(cursor);
      if (!batch.rows.length) return controller.close();
      cursor = batch.cursor;
      controller.enqueue(encoder.encode(batch.rows.map((r) => toCsvRow(toValues(r))).join("\n") + "\n"));
      if (!cursor) controller.close();
    },
  });
}

export function csvResponse(body: BodyInit, filename: string) {
  const safeFilename = filename.toLowerCase().endsWith(".csv") ? filename : `${filename}.csv`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeFilename}"`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export const todayStamp = () => new Date().toISOString().slice(0, 10);

/** Reads an uploaded CSV file from form data, enforcing size & extension limits. */
export async function readCsvUpload(file: FormDataEntryValue | null): Promise<{ text?: string; error?: string }> {
  if (!file || typeof file === "string" || !file.size) return { error: "Choose a CSV file to upload." };
  if (file instanceof File && !file.name.toLowerCase().endsWith(".csv")) {
    return { error: "Invalid file type. Please upload a .csv file." };
  }
  if (file.size > MAX_CSV_BYTES) return { error: "File is larger than 1 MB." };
  return { text: await file.text() };
}
