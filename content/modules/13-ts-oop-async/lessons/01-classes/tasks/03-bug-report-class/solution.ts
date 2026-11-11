export class BugReport {
  id: number;
  title: string;
  status = 'New';
  assignee: string | null = null;

  constructor(id: number, title: string) {
    this.id = id;
    this.title = title;
  }

  assign(name: string): void {
    this.assignee = name;
    this.status = 'Assigned';
  }

  close(): void {
    this.status = 'Closed';
  }

  isOpen(): boolean {
    return this.status !== 'Closed';
  }
}
