/*
 * Deterministic teaching content for the landing page. Everything here is hand-written and verified:
 * nothing is generated at runtime and nothing calls the real Python runner, the IDE or an AI model.
 */

export type Subject = "python" | "html" | "css";

export const SUBJECTS: readonly { id: Subject; label: string }[] = [
  { id: "python", label: "Python" },
  { id: "html", label: "HTML" },
  { id: "css", label: "CSS" },
];

/* ---------- Concept maps ---------- */

export interface MapNode {
  label: string;
  blurb: string;
}

export interface SubjectMap {
  title: string;
  /** The concept the demo selects on its own. It sits at slot 0 and owns the child nodes. */
  focus: MapNode;
  /** Five more first-level concepts, placed clockwise at slots 1 to 5. */
  others: [MapNode, MapNode, MapNode, MapNode, MapNode];
  children: [MapNode, MapNode, MapNode, MapNode, MapNode];
  /** Where the explanation card sends you next. */
  next: string;
}

export const MIND_MAPS: Record<Subject, SubjectMap> = {
  python: {
    title: "Python Fundamentals",
    focus: {
      label: "Loops",
      blurb: "Loops repeat a block of code. for, while and range() decide how many times.",
    },
    others: [
      { label: "Lists", blurb: "A list keeps many values under one name, in order." },
      { label: "Functions", blurb: "A function packages steps so you can reuse them." },
      { label: "Data Types", blurb: "Numbers, text and booleans each behave differently." },
      { label: "Conditions", blurb: "if decides which code runs, based on True or False." },
      { label: "Variables", blurb: "A variable gives a value a name you can reuse." },
    ],
    children: [
      { label: "For loops", blurb: "for takes each value from a sequence, one per lap." },
      { label: "While loops", blurb: "while repeats as long as its condition stays True." },
      { label: "range()", blurb: "range(3) makes 0, 1, 2. The stop value is never included." },
      { label: "Iteration", blurb: "One pass through the loop body is one iteration." },
      { label: "Loop variable", blurb: "The name, like i, that holds the current value." },
    ],
    next: "See Loops run",
  },
  html: {
    title: "HTML Basics",
    focus: {
      label: "Elements",
      blurb: "An element is an opening tag, its content and a closing tag. Elements nest.",
    },
    others: [
      { label: "Attributes", blurb: "Attributes like class add information to a tag." },
      { label: "Headings", blurb: "h1 to h6 give a page its outline." },
      { label: "Paragraphs", blurb: "p holds a block of running text." },
      { label: "Links", blurb: "a connects one page to another." },
      { label: "Forms", blurb: "Forms collect what a visitor types." },
    ],
    children: [
      { label: "<div>", blurb: "A generic container that groups other elements." },
      { label: "<h2>", blurb: "A second-level heading." },
      { label: "<p>", blurb: "A paragraph of text." },
      { label: "Nesting", blurb: "Elements inside elements form a tree." },
      { label: "Closing tags", blurb: "Every opened element is closed again." },
    ],
    next: "See the DOM tree",
  },
  css: {
    title: "CSS Basics",
    focus: {
      label: "Box model",
      blurb: "Every element is a box: content, then padding, border and margin.",
    },
    others: [
      { label: "Selectors", blurb: "A selector picks which elements a rule styles." },
      { label: "Colors", blurb: "Colors set text, borders and backgrounds." },
      { label: "Typography", blurb: "Font, size and spacing shape how text reads." },
      { label: "Layout", blurb: "Flexbox and grid arrange boxes on the page." },
      { label: "Spacing", blurb: "Margin and padding control the space around content." },
    ],
    children: [
      { label: "padding", blurb: "Space inside the box, between content and border." },
      { label: "margin", blurb: "Space outside the box, pushing neighbours away." },
      { label: "border", blurb: "A line drawn around the padding." },
      { label: "border-radius", blurb: "Rounds the corners of the box." },
      { label: "background", blurb: "The fill behind the content." },
    ],
    next: "See styles apply",
  },
};

/* ---------- Python: for i in range(3): print(i) ---------- */

export const LOOP_CODE = "for i in range(3):\n    print(i)";

export interface LoopStep {
  /** Line being executed (1 = the for statement, 2 = print). */
  line: 1 | 2;
  /** Value of i after this step; null before the first lap. */
  i: number | null;
  /** Everything printed so far. */
  out: number[];
  /** Completed or current lap, 0 to 3. */
  lap: number;
  /** The flow just came back from print(i) to the for statement. */
  returning: boolean;
  done: boolean;
  caption: string;
}

/** Verified by hand against CPython semantics: i keeps its last value, 2, after the loop ends. */
export const LOOP_TRACE: readonly LoopStep[] = [
  {
    line: 1,
    i: null,
    out: [],
    lap: 0,
    returning: false,
    done: false,
    caption: "range(3) produces 0, 1, 2. The for statement takes them one at a time.",
  },
  { line: 1, i: 0, out: [], lap: 1, returning: false, done: false, caption: "Lap 1: i becomes 0." },
  {
    line: 2,
    i: 0,
    out: [0],
    lap: 1,
    returning: false,
    done: false,
    caption: "print(i) writes 0 to the output.",
  },
  {
    line: 1,
    i: 1,
    out: [0],
    lap: 2,
    returning: true,
    done: false,
    caption: "Back to the loop. Lap 2: i becomes 1.",
  },
  {
    line: 2,
    i: 1,
    out: [0, 1],
    lap: 2,
    returning: false,
    done: false,
    caption: "print(i) writes 1.",
  },
  {
    line: 1,
    i: 2,
    out: [0, 1],
    lap: 3,
    returning: true,
    done: false,
    caption: "Lap 3: i becomes 2, the last value.",
  },
  {
    line: 2,
    i: 2,
    out: [0, 1, 2],
    lap: 3,
    returning: false,
    done: false,
    caption: "print(i) writes 2.",
  },
  {
    line: 1,
    i: 2,
    out: [0, 1, 2],
    lap: 3,
    returning: true,
    done: true,
    caption: "range(3) has no values left, so the loop ends. It ran 3 times.",
  },
];

/* ---------- HTML to DOM ---------- */

export const HTML_LINES = [
  '<div class="card">',
  "  <h2>Hello World</h2>",
  "  <p>My first webpage</p>",
  "</div>",
] as const;

export type DomId = "div" | "h2" | "p";

export interface DomNode {
  id: DomId;
  tag: string;
  /** Code lines this element occupies (1-based). */
  lines: number[];
  /** x, y in the 240x120 tree viewBox. */
  at: [number, number];
  parent?: DomId;
  note: string;
}

export const DOM_NODES: readonly DomNode[] = [
  {
    id: "div",
    tag: "<div>",
    lines: [1, 4],
    at: [120, 24],
    note: "The parent: it contains the heading and the paragraph.",
  },
  {
    id: "h2",
    tag: "<h2>",
    lines: [2],
    at: [58, 92],
    parent: "div",
    note: "A child of div: the page heading.",
  },
  {
    id: "p",
    tag: "<p>",
    lines: [3],
    at: [182, 92],
    parent: "div",
    note: "A child of div: a paragraph of text.",
  },
];

/* ---------- CSS ---------- */

export const CSS_LINES = [
  ".card {",
  "  background: #eef2ff;",
  "  padding: 24px;",
  "  border-radius: 16px;",
  "}",
] as const;

export type CssProp = "background" | "padding" | "radius";

export const CSS_NOTES: Record<CssProp, { name: string; text: string }> = {
  background: { name: "background", text: "Fills the box behind the content." },
  padding: { name: "padding", text: "Adds space inside the box, around the content." },
  radius: { name: "border-radius", text: "Rounds the corners of the box." },
};
