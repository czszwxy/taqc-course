export interface Issue {
  id: number;
  title: string;
}

export interface Story extends Issue {
  points: number;
  acceptanceCriteria: string[];
}

export function storyLine(story: Story): string {
  return `US-${story.id}: ${story.title} — ${story.points} pts, ${story.acceptanceCriteria.length} AC`;
}
