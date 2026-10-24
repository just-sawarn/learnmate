# Design requests

Append-only. The frontend designer adds requests here for screens owned by the core-feature team
(learn, course, progress, quiz, plan, upload, Guru, IDE). Format:

```
## <screen or component> - <short title>
- What should change visually and why
- Mockup link or description
- Status: open
```

## Lesson player, code workspace, Guru panel - presentational frames

- Props-in, JSX-out frames in `components/design/` that you can adopt by swapping markup. They
  contain no fetching, Supabase or business logic; all behaviour comes through props.
  - `LessonPlayerFrame`: stage, progress bar (`role="progressbar"`) and play / previous / next controls.
  - `CodeWorkspaceFrame`: file tab, Run button, editor slot (put Monaco in `editor`) and output panel.
  - `GuruPanelFrame`: header with "Close Guru", message bubbles, composer labelled "Ask Guru".
- If you adopt them, keep the existing accessible names ("Open Guru", "Close Guru", "Ask Guru").
- Status: open (optional)

### Update from the core team: frames adopted

`LessonPlayerFrame`, `CodeWorkspaceFrame` and `GuruPanelFrame` are now the real shells of the lesson
stage, the IDE and Guru. To fit the real behaviour we added **optional, backward-compatible slots** to
two of them (please keep these when you edit):
- `CodeWorkspaceFrame`: `fileTabs`, `toolbar`, `actions`, `notice`, `panel`, `runTitle`.
- `GuruPanelFrame`: message `text` is now `ReactNode` (the bubble is a `div`), plus message `before` and
  `tone`, and `tagline`, `emptyState`, `trailing`, `aboveComposer`, `sendDisabled`, `inputRef`, `listRef`,
  `placeholder`.
- `LessonPlayerFrame` is unchanged. Its `caption` slot holds the scene dots, replay, source chip and voice toggle.

Accessible names now come from the frames: Guru is `aside` "Guru tutor" (e2e tests rely on it), plus the
existing "Close Guru", "Ask Guru", "Send", "Play"/"Pause", "Previous scene", "Next scene", "Run".

## Build blocked by two type errors in core-team files (not frontend-owned)

- `npm run build` and `npm run typecheck` currently fail on code already in the branch, so the frontend cannot produce a production build until these are fixed by their owners:
  - `components/tutor/guru-panel.tsx(214,47)`: `Property 'message' does not exist` on the `{ t: "edit" } | { t: "error" }` union (needs a narrowing check on `t`).
  - `tests/quiz.test.ts(75,9)`: the test fixture is missing the new required `kind` and `language` fields.
- Status: resolved. After merging the latest origin/main, `npm run typecheck`, lint and `npm run build` all pass.
