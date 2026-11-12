import { isPalindrome, reverseWords, mostFrequentChar, fizzBuzz } from './solution';

describe('isPalindrome', () => {
  it('detects a simple palindrome', () => {
    expect(isPalindrome('level')).toBe(true);
    expect(isPalindrome('playwright')).toBe(false);
  });

  it('ignores case and spaces', () => {
    expect(isPalindrome('Never odd or even')).toBe(true);
  }, 'Переведи в нижній регістр і прибери пробіли до порівняння.');

  it('ignores punctuation', () => {
    expect(isPalindrome('A man, a plan, a canal: Panama!')).toBe(true);
  }, 'Прибирай усе, крім латинських літер і цифр: `.replace(/[^a-z0-9]/g, \'\')` після `toLowerCase()`.');

  it('treats an empty string as a palindrome', () => {
    expect(isPalindrome('')).toBe(true);
  });
});

describe('reverseWords', () => {
  it('reverses the word order', () => {
    expect(reverseWords('login page works')).toBe('works page login');
  });

  it('collapses extra spaces and trims', () => {
    expect(reverseWords('  login  page   works ')).toBe('works page login');
  }, 'Після `split(\' \')` з\'являються порожні рядки — відфільтруй їх (`filter((w) => w !== \'\')`).');

  it('keeps a single word as is', () => {
    expect(reverseWords('smoke')).toBe('smoke');
  });

  it('returns an empty string for an empty or blank input', () => {
    expect(reverseWords('')).toBe('');
    expect(reverseWords('   ')).toBe('');
  });
});

describe('mostFrequentChar', () => {
  it('finds the most frequent character', () => {
    expect(mostFrequentChar('test plan')).toBe('t');
  });

  it('does not count spaces', () => {
    expect(mostFrequentChar('a b c   b')).toBe('b');
  }, 'Пробіли пропускай: `if (char === \' \') continue;`.');

  it('on a tie returns the character that appeared first', () => {
    expect(mostFrequentChar('abab')).toBe('a');
    expect(mostFrequentChar('bbaa')).toBe('b');
  }, 'Оновлюй лідера лише коли кількість **строго більша** (`>`), а не `>=`.');

  it('is case-sensitive', () => {
    expect(mostFrequentChar('aAA')).toBe('A');
  });

  it('returns null when there is nothing to count', () => {
    expect(mostFrequentChar('')).toBeNull();
    expect(mostFrequentChar('   ')).toBeNull();
  }, 'Якщо символів немає — поверни `null`, а не порожній рядок чи `undefined`.');
});

describe('fizzBuzz', () => {
  it('returns the first five values', () => {
    expect(fizzBuzz(5)).toEqual(['1', '2', 'Fizz', '4', 'Buzz']);
  }, 'Числа — рядками: `String(i)`.');

  it('returns FizzBuzz for multiples of 15', () => {
    const result = fizzBuzz(15);
    expect(result).toHaveLength(15);
    expect(result[14]).toBe('FizzBuzz');
    expect(result[9]).toBe('Buzz');
  }, 'Перевір кратність 15 **першою**, інакше спрацює гілка для 3 або 5.');

  it('returns an empty array for 0', () => {
    expect(fizzBuzz(0)).toEqual([]);
  });
});
