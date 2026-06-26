export function rowsToCsv(
  rows: Array<Record<string, string | number | boolean | null | undefined>>
) {
  if (!rows.length) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => escapeCsvCell(row[header]))
        .join(",")
    )
  ];

  return lines.join("\n");
}

function escapeCsvCell(value: string | number | boolean | null | undefined) {
  const text = value == null ? "" : String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export function toPlainShareText(title: string, lines: string[]) {
  return [title, ...lines].join("\n");
}
