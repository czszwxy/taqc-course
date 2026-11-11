export abstract class Notifier {
  constructor(readonly channel: string) {}

  abstract format(message: string): string;

  send(message: string): string {
    return `[${this.channel}] ${this.format(message)}`;
  }
}

// твій код тут: EmailNotifier і SlackNotifier
