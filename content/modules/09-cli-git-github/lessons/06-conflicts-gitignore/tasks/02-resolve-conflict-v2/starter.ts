// Цей файл — результат `git merge main` у гілці feature/parallel-run.
// Git позначив два конфлікти. Розв'яжи їх за рішенням команди з умови.

export const runConfig = {
  baseUrl: 'https://staging.gadgetly.test',
<<<<<<< HEAD
  timeoutMs: 30000,
  retries: 2,
=======
  timeoutMs: 15000,
  retries: 0,
  workers: 4,
>>>>>>> feature/parallel-run
};

export function reportName(suite: string): string {
<<<<<<< HEAD
  return `report-${suite}.html`;
=======
  return `${suite}-report.html`;
>>>>>>> feature/parallel-run
}
