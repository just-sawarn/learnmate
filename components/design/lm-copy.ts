/** The landing page's words, in a plain module so server and client components can both read them. */

export const COPY = {
  nav: [
    { label: "Features", href: "#features" },
    { label: "How it works", href: "#how-it-works" },
    { label: "Guru", href: "#guru" },
    { label: "FAQ", href: "#faq" },
  ],
  trust: {
    label: "Powered by",
    items: [
      { name: "Gemini", role: "builds your lessons and quizzes" },
      { name: "Claude", role: "Guru, your tutor" },
      { name: "Groq", role: "instant tips" },
      { name: "Supabase", role: "your account and files" },
    ],
  },
  problem: {
    eyebrow: "The problem",
    lead: "You have the notes. You don't know what you don't know.",
    struck: [
      "Re-reading the same chapter",
      "Copy-pasting into a chatbot",
      "Watching someone else code",
    ],
    resolution: "LearnMate makes you do it, and shows you exactly where you're stuck.",
  },
  features: { eyebrow: "Features", title: "Everything a great tutor does, from one PDF." },
  how: { eyebrow: "How it works", title: "From PDF to “I get it” in four steps." },
  guru: {
    eyebrow: "Meet Guru",
    title: "A tutor that asks before it tells.",
    manifesto: [
      "A master tutor who can teach anything to anyone.",
      "Learns what you already know.",
      "Explains with everyday analogies.",
      "Prefers a good question to an answer.",
      "Celebrates your progress specifically.",
    ],
    chat: [
      { from: "student", text: "why does range stop before 5?" },
      {
        from: "guru",
        text: "Think of a fence: range(5) hands you five posts, numbered from 0, so the last one is 4. The 5 marks where the fence ends, not a post. (p. 6)",
      },
      { from: "student", text: "so range(1, 5) skips post 0?" },
      { from: "guru", text: "Exactly. You spotted the off-by-one yourself. Now run it again." },
    ],
    looked: "What Guru looked at",
    lookedItems: "p. 6 · your code · 2 failing tests",
  },
  faq: {
    eyebrow: "FAQ",
    title: "Questions, answered.",
    items: [
      { q: "What can I upload?", a: "A PDF of up to 20 pages, or pasted text." },
      {
        q: "Which languages can I run?",
        a: "HTML/CSS/JS, React, Python, C, C++, Java, Go and Rust, all in the side-along IDE.",
      },
      {
        q: "Will Guru just give me the answer?",
        a: "No. Guru climbs a three-rung hint ladder, starting with a guiding question, and only shows a partial fix after you've asked twice.",
      },
      {
        q: "What happens if my question isn't in my notes?",
        a: "Guru still helps, but labels the reply “Beyond your uploaded material” so you know it isn't from your source.",
      },
      {
        q: "Does it work in Hindi?",
        a: "Yes. Captions can switch to Hindi, and there are spoken summaries.",
      },
      {
        q: "Is my material private?",
        a: "It's stored in your own Supabase account and protected by row-level security.",
      },
    ],
  },
  cta: { title: "Stop re-reading. Start doing." },
};
