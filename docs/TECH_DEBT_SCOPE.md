# Technical Debt Scope (Separated from Feature Work)

This file tracks debt intentionally kept outside core feature delivery.

## Why this exists

Velora is a portfolio MVP focused on clear, reliable core flows.  
To keep feature work controlled, large cleanup tasks are handled in separate phases.

## Current separated debt

1. Global ESLint debt in unrelated legacy files.
2. CI lint currently non-blocking (`continue-on-error: true`) until debt cleanup is done.

## Rules

- Do not mix global lint cleanup with domain feature commits.
- Do not run repo-wide `lint --fix`/formatting during feature phases.
- Keep build and tests as blocking quality gates.

## Planned debt sequence

1. `chore(lint): clean global lint debt` (separate PR/commit series)
2. Re-enable blocking CI lint
3. Optional: further non-functional cleanup only after core demo flow is stable
