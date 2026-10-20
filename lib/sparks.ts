// Built-in "Story Sparks" questions, used when the user has no CV (no AI call).
export type SparkPrompt = {
  id: string;
  question: string;
  source_experience: string;
  target_tag: string;
  status: "open" | "answered" | "skipped";
  created_at: string;
};

const GENERIC: Record<string, string[]> = {
  leadership: [
    "Think of a group project at university. Was there a moment when you had to take the lead? What did you do?",
    "Have you ever organised something for other people — an event, a trip, a club activity? What was the hardest moment?",
  ],
  teamwork: [
    "Remember a team you were part of. When did you help someone else succeed? What exactly did you do?",
    "Was there a time when your team was stuck? How did you help it move forward?",
  ],
  conflict: [
    "Think of a time someone disagreed with you in a group project. What did you say, and how did it end?",
    "Have you ever had to work with someone who was difficult? What was one moment you handled well?",
  ],
  failure: [
    "Think of something that went wrong — an exam, a project, a plan. What did you do right after?",
    "When did you miss a goal you cared about? What did you change afterwards?",
  ],
  impact: [
    "When did something you did make a real difference for others? What changed because of you?",
    "Think of a result you are proud of. Can you put a number on it (people, money, time saved)?",
  ],
  initiative: [
    "Was there a moment when you started something nobody asked you to do? What made you start?",
    "Think of a problem you noticed before anyone else. What did you do about it?",
  ],
  adaptability: [
    "When did a plan suddenly change — a new country, a new job, a cancelled event? How did you adapt?",
    "Think of a time you had to learn something new very fast. How did you do it?",
  ],
  motivation: [
    "What is something you worked hard on without being told to? Why did it matter to you?",
    "Think of a moment when you nearly gave up but didn't. What kept you going?",
  ],
};

export function genericQuestions(tagsByPriority: string[], max = 8) {
  const out: { question: string; source_experience: string; target_tag: string }[] = [];
  // Round-robin: first question of each tag, then the second ones
  for (let round = 0; round < 2 && out.length < max; round++) {
    for (const tag of tagsByPriority) {
      if (out.length >= max) break;
      const list = GENERIC[tag.trim().toLowerCase()] ?? [
        `Think of a moment that shows your ${tag.trim().toLowerCase()}. What happened, and what did you do?`,
        `When did ${tag.trim().toLowerCase()} matter in your studies, work or free time? Describe one concrete moment.`,
      ];
      if (list[round]) out.push({ question: list[round], source_experience: "", target_tag: tag });
    }
  }
  return out;
}
