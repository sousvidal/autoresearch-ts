export interface Example {
  text: string;
  label: "positive" | "negative";
}

/**
 * Fetches examples from the rotten_tomatoes dataset via the HF datasets viewer API.
 * No authentication required.
 */
export async function fetchExamples(
  split: "train" | "test" | "validation",
  offset: number,
  length: number,
): Promise<Example[]> {
  const url = `https://datasets-server.huggingface.co/rows?dataset=cornell-movie-review-data%2Frotten_tomatoes&config=default&split=${split}&offset=${offset}&length=${length}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch dataset: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as {
    rows: Array<{ row: { text: string; label: number } }>;
  };
  return data.rows.map(({ row }) => ({
    text: row.text,
    label: row.label === 1 ? "positive" : "negative",
  }));
}
