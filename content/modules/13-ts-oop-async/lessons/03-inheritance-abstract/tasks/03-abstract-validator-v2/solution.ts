export abstract class Notifier {
  constructor(readonly channel: string) {}

  abstract format(message: string): string;

  send(message: string): string {
    return `[${this.channel}] ${this.format(message)}`;
  }
}

export class EmailNotifier extends Notifier {
  constructor() {
    super('email');
  }

  format(message: string): string {
    return `Subject: ${message}`;
  }
}

export class SlackNotifier extends Notifier {
  constructor() {
    super('slack');
  }

  format(message: string): string {
    return `:rotating_light: ${message.toUpperCase()}`;
  }
}
