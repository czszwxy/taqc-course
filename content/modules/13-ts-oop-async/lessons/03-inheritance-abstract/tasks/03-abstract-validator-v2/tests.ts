import { EmailNotifier, Notifier, SlackNotifier } from './solution';

describe('notifiers', () => {
  it('email', () => expect(new EmailNotifier().send('Build failed')).toBe('[email] Subject: Build failed'));
  it('slack', () => expect(new SlackNotifier().send('Build failed')).toBe('[slack] :rotating_light: BUILD FAILED'));
  it('both are Notifiers', () => {
    const all: Notifier[] = [new EmailNotifier(), new SlackNotifier()];
    expect(all.map((n) => n.channel)).toEqual(['email', 'slack']);
  });
});
