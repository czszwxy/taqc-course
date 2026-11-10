export function getInitials(fullName: string): string {
  const parts = fullName.split(' ');
  return parts[0][0].toUpperCase() + parts[1][0].toUpperCase();
}
