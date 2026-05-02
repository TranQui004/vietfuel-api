# Code Comment Style Guide

This guide defines a consistent comment style across the repository.

## 1. Language

- All new comments should be written in Vietnamese with diacritics.
- Avoid mixing English in comments unless strictly necessary.

## 2. Format

Use one of these formats:

- Single-line:
  - `// [SECTION] Short explanation.`
- Block:
  - `/* ==========================================================================`
  - ` * [SECTION] Short explanation.`
  - ` * ========================================================================== */`

## 3. When to Comment

Comment when:

- There is fallback/retry/anti-bot logic or business mapping.
- A technical decision is not obvious.
- Data constraints are important to avoid subtle bugs.

Avoid comments when:

- The code is already self-explanatory.

## 4. Example

Good:

- `// [PVOIL] Nguồn trực tiếp bị chặn, chuyển sang fallback trung gian.`

Bad:

- `// get data`
- `// process`

## 5. Migration Plan

Because the project has existing history, old comments should be migrated incrementally when touching related code.
All new files and newly edited code blocks must follow this convention.

---
**� 2026 TranQui - [GitHub: TranQui004](https://github.com/TranQui004)**
*VietFuel API Project*
