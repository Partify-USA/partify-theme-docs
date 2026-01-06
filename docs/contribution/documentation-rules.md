---
sidebar_position: 1000
---

# 📘 Shopify Theme Documentation Standards

**Audience:** Frontend engineers working on the Shopify theme  
**Scope:** Theme JSON templates, Liquid, JavaScript, and app integrations  
**Goal:** Clear, consistent, maintainable documentation without over-documentation

---

## Core Documentation Principles

These principles apply to every documentation file.

### 1. Explain Why Before What, How Last

Code already shows **how**. Documentation must explain:

- **Intent** — What problem does this solve?
- **Constraints** — What limitations exist?
- **Tradeoffs** — What alternatives were rejected?
- **Failure modes** — What breaks if this changes?

### 2. Every Document Answers the Same Questions

Every markdown file must clearly answer:

- What does this control?
- What data flows in?
- What data flows out?
- What can break if this changes?

### 3. No Ownerless Documentation

Each document must include:

- Owner (team or role)
- Last updated date

### 4. Accuracy Over Volume

**Outdated documentation is worse than missing documentation.**

If a section no longer reflects reality, remove or update it immediately.

### 5. Brevity and Clarity

**Keep documentation short and concise for ease-of-reading.**

- Prioritize understandability over completeness
- Use bullet points instead of long paragraphs
- Remove redundant explanations
- One clear sentence is better than three vague ones

### 6. No Links to Source Code Files

**Do not link to `.liquid`, `.js`, or other source files in documentation.**

- Links to source files will break during Docusaurus compilation
- Use code formatting (backticks) to reference files: `sections/navbar.liquid`
- Link only to other documentation pages within `/docs`

---

## Documentation Structure (Docusaurus)

```
docs/
├── overview/
│   ├── theme-architecture.md
│   ├── data-flow.md
│   └── global-conventions.md
├── pages/
│   ├── home-page.md
│   ├── collection-page.md
│   ├── product-page.md
│   └── accounts.md
├── global-components/
│   ├── navbar.md
│   ├── footer.md
│   └── modals-and-drawers.md
├── data-and-integrations/
│   ├── metafields.md
│   ├── apps.md
│   └── localstorage.md
├── patterns-and-standards/
│   ├── javascript-patterns.md
│   ├── liquid-patterns.md
│   └── error-handling.md
└── contribution/
    ├── documentation-rules.md
    └── pr-checklist.md
```

---

## Mandatory Markdown Template

Every page-level or component-level document must follow this structure:

`````markdown
---
title: <Clear Title>
description: <One sentence summary>
---

## Purpose

High-level description of what this file or system is responsible for.
One paragraph maximum.

## Scope of Responsibility

### Owns

- List responsibilities explicitly

### Does Not Own

- List what is intentionally handled elsewhere

## Data In

List all required inputs:

- Shopify objects
- Metafields
- LocalStorage keys
- App-provided state

## Data Out / Side Effects

- DOM mutations
- Events emitted
- Global variables written
- Network calls triggered

## Key Logic Areas

### <Logical Area Name>

Describe **decision trees**, not implementation details.

## Known Constraints & Gotchas

- Assumptions
- Fragile dependencies
- Known inconsistencies
- App limitations

## Safe to Change

- Cosmetic updates
- Non-stateful UI changes
- Logging

## Dangerous to Change

- Variant mapping
- Global event names
- Shared state
- LocalStorage keys

## Related Files

- List closely related Liquid / JS files

## Owner & Maintenance

- **Owner:** Frontend Team
- **Last Updated:** YYYY-MM-DD

---

## Page-Specific Documentation Rules

### Home Page (index.json)

**Document:**

- Section ordering logic
- Performance implications
- Data dependencies

**Do NOT document:**

- Visual design
- Shopify defaults

**Required sections:**

- Dynamic vs static content
- SEO dependencies
- Section-level risks

### Collections Page (collections.json)

**Document:**

- Filtering logic
- Sorting rules
- Vehicle fitment interaction

**Explicitly state:**

- Client vs server filtering
- Predictive search behavior
- Edge cases when filters desync

### Products Page (products.json)

This document should be the most detailed, but still scoped.

**Must include:**

- Variant lifecycle
- VIN / fitment enforcement rules
- App interaction boundaries

**Avoid:**

- Line-by-line logic
- Repeating helper utilities

### Accounts Page

**Document:**

- Auth state dependencies
- Shopify customer object usage
- Shopify customer object usage

Conditional rendering rules

Global Components Documentation
Navbar & Footer

Focus on state, not markup.

## State Sources

- Cart count → Shopify AJAX API
- Vehicle selection → localStorage
- Auth state → Shopify customer object

---

---

## JavaScript Documentation Rules

### What Requires Documentation

✅ **Document:**

- Global variables
- Custom events
- Cross-file dependencies
- App integration boundaries

❌ **Do NOT document:**

- Utility functions
- Obvious DOM operations
- One-off helpers

### Required JS Comment Standard

````javascript
/**
 * @responsibility Enforces variant + fitment compatibility
 * @dependsOn EasySearch, localStorage.searchTerms
 * @emits variant:change
 */
```sponsibility Enforces variant + fitment compatibility
- @dependsOn EasySearch, localStorage.searchTerms
---

## Documentation Change Rules

### Documentation updates are MANDATORY for:

- New global state
- New events
- Changes to page behavior
- App integration changes

### Documentation updates are NOT required for:

- CSS-only changes
- Refactors with no behavior change

---

## Pull Request Documentation Checklist

Every PR must include this checklist:

```markdown
### Documentation Checklist

- [ ] Introduced new global state
- [ ] Modified existing data flow
- [ ] Added or changed custom events
- [ ] Touched index, collections, or products logic
- [ ] Updated relevant documentation
````
`````

```

> **Rule:** No checked boxes + no doc update = **no merge**ts logic

- [ ] Updated relevant documentation

No checked boxes + no doc update = no merge.
```
