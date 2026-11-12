export function isPalindrome(text: string): boolean {
  const clean = text.toLowerCase().replace(/[^a-z0-9]/g, '');
  return clean === [...clean].reverse().join('');
}

export function reverseWords(sentence: string): string {
  return sentence
    .split(' ')
    .filter((word) => word !== '')
    .reverse()
    .join(' ');
}

export function mostFrequentChar(text: string): string | null {
  const counts = new Map<string, number>();
  for (const char of text) {
    if (char === ' ') continue;
    counts.set(char, (counts.get(char) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [char, count] of counts) {
    if (count > bestCount) {
      best = char;
      bestCount = count;
    }
  }
  return best;
}

export function fizzBuzz(n: number): string[] {
  const result: string[] = [];
  for (let i = 1; i <= n; i++) {
    if (i % 15 === 0) result.push('FizzBuzz');
    else if (i % 3 === 0) result.push('Fizz');
    else if (i % 5 === 0) result.push('Buzz');
    else result.push(String(i));
  }
  return result;
}
