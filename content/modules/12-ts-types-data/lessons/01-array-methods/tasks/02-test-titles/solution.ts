export function numberTitles(titles: string[]): string[] {
  return titles.map((title, index) => `${index + 1}. ${title}`);
}
