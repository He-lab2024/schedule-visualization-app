# Recovery Context

This file records the project context recovered on 2026-06-08 after the earlier chat history was no longer visible in the current Codex thread.

## What Could Be Recovered

- Current Codex thread available through the app: `019ea57c-44df-7a10-a2bc-05686779bef0`, titled `查找对话丢失原因`.
- The readable thread history starts at the user asking why the prior conversation disappeared. No older thread for this workspace appeared in the Codex thread list.
- The project Git history is intact and gives a reliable build timeline.
- Screenshots in `screenshots/` preserve visual checkpoints from earlier implementation rounds.
- `vite-dev.log` shows the dev server previously ran at `http://127.0.0.1:5173/` and hot-reloaded edits to `src/App.tsx` and `src/styles.css` around 12:22-12:25.

## Project Identity

- Workspace: `C:\Users\12107\Documents\日程计划可视化设计`
- App: Vite + React + TypeScript schedule visualization dashboard
- Package name: `schedule-visualization-app`
- Remote: `https://github.com/He-lab2024/schedule-visualization-app.git`
- Branch: `main`
- HEAD: `6e98fa0 Add persistence and backup workflow`

## Recovered Timeline

- 08:22 - `4cbcbd1 Add initial schedule visualization design`
  - Added `.gitignore`.
  - Added the initial PowerPoint design file.
- 08:44 - `c17a9eb Initialize React dashboard prototype`
  - Scaffolded the Vite/React project.
  - Added the first large dashboard implementation in `src/App.tsx` and `src/styles.css`.
  - Screenshots include `today-dashboard.png`, `week-matrix.png`, `project-progress.png`, `workbench.png`, `review.png`, and `mobile-today.png`.
- 08:54 - `9b9096e Add shared data model linkage`
  - Split shared data and types into `src/mockData.ts`, `src/selectors.ts`, and `src/types.ts`.
  - Reworked `src/App.tsx` to use the shared model.
  - Screenshots include `round2-today.png`, `round2-projects.png`, and `round2-settings.png`.
- 09:03 - `451df17 Implement task management MVP`
  - Added task create/edit/complete workflows.
  - Added sticky form actions and task drawer behavior.
  - Screenshots include `round3-created-task.png`, `round3-edited-task.png`, `round3-completed-task.png`, `round3-week-new-task.png`, and `round3-form-sticky-actions.png`.
- 09:13 - `e7f1f0f Add customization controls`
  - Added settings/customization surfaces.
  - Added configurable presets, categories, widgets, and field templates.
  - Screenshots include `round4-settings-initial.png` and `round4-paper-sprint-home.png`.
- 09:15 - `c08a953 Add data-driven review insights`
  - Added review metrics and suggestions in `src/selectors.ts`.
  - Screenshot includes `round5-review.png`.
- 12:20 - `6e98fa0 Add persistence and backup workflow`
  - Added local persistence and backup/restore workflow.
  - Current committed app state builds successfully.
- 12:22-12:25 - uncommitted work continued
  - Added top bar search, task filters, and quick jumps in `src/App.tsx`.
  - Added responsive styles for search/filter controls in `src/styles.css`.

## Current Uncommitted Work

Files modified:

- `src/App.tsx`
- `src/styles.css`

Recovered intent:

- Turn top-bar search placeholder into a real controlled input.
- Add task filters: `全部`, `进行中`, `风险`, `已完成`.
- Add quick-jump buttons: `今日`, `本周`.
- Apply filtered task lists across Today, Week, Projects, Workbench, and Review views.
- Make the top action controls wrap cleanly on small screens.

Current diff size:

- `src/App.tsx`: search/filter state and filtering helpers.
- `src/styles.css`: search input, quick jump buttons, filter tabs, mobile wrapping.

## Main Source Structure

- `src/App.tsx`
  - App shell, top bar, main views, task form, drawer, settings, review, and shared UI components.
- `src/mockData.ts`
  - App date, categories, projects, initial tasks, week days, widgets, view presets, and field templates.
- `src/selectors.ts`
  - Derived metrics, task grouping, project runtime state, review stats, and review suggestions.
- `src/types.ts`
  - Shared domain types for tasks, projects, categories, widgets, presets, and templates.

## Build And Run Notes

The normal `npm run build` failed because the global npm shim points to a missing path:

```powershell
C:\Users\12107\AppData\Roaming\npm\node_modules\npm\bin\npm-cli.js
```

Use the working local Node/npm path instead:

```powershell
node "D:\Download\Node\node_modules\npm\bin\npm-cli.js" run build
```

This build was verified successfully after recovering context.

The previous dev server log shows:

```text
http://127.0.0.1:5173/
```

## Best Next Step

Finish the uncommitted top-bar search/filter enhancement, visually verify it in the app, then commit it with a message such as:

```text
Add global task search and filters
```
