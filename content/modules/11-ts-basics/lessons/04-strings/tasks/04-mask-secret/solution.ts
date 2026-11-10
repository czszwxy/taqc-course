export function maskSecret(secret: string): string {
  const stars = '*'.repeat(secret.length - 4);
  const tail = secret.slice(-4);
  return stars + tail;
}
