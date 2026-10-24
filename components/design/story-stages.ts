import {
  Bot,
  BookOpenText,
  Code2,
  Globe,
  ListChecks,
  Network,
  PlayCircle,
  Route,
  Trophy,
  Upload,
  type LucideIcon,
} from "lucide-react";

export interface StoryStage {
  id: string;
  /** Short stepper label. */
  label: string;
  icon: LucideIcon;
  /** Which of the four How it works steps this stage belongs to (0 to 3). */
  step: 0 | 1 | 2 | 3;
  /** Falling headline on the left. */
  title: string;
  body: string;
  /** Ambient light: three brand colours, remixed per stage. */
  glow: [string, string, string];
}

const b1 = "var(--brand-1)";
const b2 = "var(--brand-2)";
const b3 = "var(--brand-3)";

/** One authoritative list: copy, stepper, renderer and lighting all read from it. */
export const STORY_STAGES: readonly StoryStage[] = [
  {
    id: "upload",
    step: 0,
    label: "Upload",
    icon: Upload,
    title: "Start with your own notes.",
    body: "Drop in a PDF chapter or paste your notes. LearnMate works from what you actually have to learn.",
    glow: [b1, b2, b3],
  },
  {
    id: "read",
    step: 0,
    label: "Read",
    icon: BookOpenText,
    title: "Watch a PDF get understood.",
    body: "Every page is read and tagged. Key passages are highlighted and linked to the page they came from.",
    glow: [b2, b1, b3],
  },
  {
    id: "map",
    step: 0,
    label: "Map",
    icon: Network,
    title: "Turn it into a mind map.",
    body: "Concepts become a connected map. Click one, like Loops, to see how it works. Switch subject to see another map.",
    glow: [b1, b3, b2],
  },
  {
    id: "quiz",
    step: 1,
    label: "Quiz",
    icon: ListChecks,
    title: "Discover what you don't know.",
    body: "A short diagnostic, with every question checked against your material, shows which topics are weak.",
    glow: [b3, b2, b1],
  },
  {
    id: "plan",
    step: 1,
    label: "Plan",
    icon: Route,
    title: "Your learning path. Built around you.",
    body: "Weak topics move to the front of a revision plan, so you spend time where it counts.",
    glow: [b1, b3, b2],
  },
  {
    id: "learn",
    step: 1,
    label: "Learn",
    icon: PlayCircle,
    title: "See the idea run.",
    body: "Step through code one line at a time, with the variable, the flow and the output changing together.",
    glow: [b2, b3, b1],
  },
  {
    id: "web",
    step: 1,
    label: "Web",
    icon: Globe,
    title: "Watch markup become a page.",
    body: "HTML builds a tree of elements. CSS declarations restyle it one rule at a time. Illustrative example.",
    glow: [b1, b2, b3],
  },
  {
    id: "code",
    step: 2,
    label: "Code",
    icon: Code2,
    title: "Don't just watch. Build.",
    body: "Write real code beside the lesson, run it, and check it against hidden tests.",
    glow: [b3, b1, b2],
  },
  {
    id: "guru",
    step: 2,
    label: "Guru",
    icon: Bot,
    title: "Get unstuck. Learn why.",
    body: "Guru sees your code and test results, then asks the question that gets you to the fix.",
    glow: [b2, b1, b3],
  },
  {
    id: "mastery",
    step: 3,
    label: "Mastery",
    icon: Trophy,
    title: "See how far you've come.",
    body: "Passed exercises lift topic mastery, and the plan updates to show what to learn next.",
    glow: [b1, b2, b3],
  },
] as const;

/** Stages whose scene follows the subject switcher. */
export const SUBJECT_STAGES: readonly number[] = [2, 5];

/** The four steps of the landing page's How it works story, in the page's own words. */
export const STORY_STEPS = [
  {
    title: "Upload your material",
    body: "Drop in a PDF of up to 20 pages. LearnMate reads it, finds the topics and builds exercises.",
  },
  {
    title: "Watch it come alive",
    body: "Each topic becomes an animated lesson: code types in, variables tick, every scene shows its source page.",
  },
  {
    title: "Try it yourself",
    body: "At every “Your turn” checkpoint an IDE slides in. Run your code, Check it against hidden tests, and let Guru ask the right question.",
  },
  {
    title: "Watch your plan change",
    body: "Mastery updates, weak topics reorder, and your revision plan moves from v1 to v2.",
  },
] as const;
