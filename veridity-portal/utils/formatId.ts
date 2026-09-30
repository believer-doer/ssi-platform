export function shortId(value: string | null | undefined, length = 12, fallback = 'unknown'): string {
  if (!value || typeof value !== 'string' || value.trim() === '') return fallback;
  return value.length > length ? `${value.substring(0, length)}...` : value;
}

export function idKey(value: string | null | undefined, fallbackPrefix = 'unknown'): string {
  if (!value || typeof value !== 'string' || value.trim() === '') return `${fallbackPrefix}-${Math.random().toString(36).substring(2, 10)}`;
  return value;
}
