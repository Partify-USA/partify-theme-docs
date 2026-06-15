---
title: write-ticket
description: >
  Formats a ticket, issue, or bug report into Partify's standard structure: a short
  descriptive Title, then Issue Summary, Details & Requirements, and Expected Behavior.
  Use this skill whenever the user asks to write, create, draft, file, open, or format a
  ticket, issue, bug report, feature request, or task. Triggers on phrases like "write a
  ticket for X", "make an issue", "draft a bug report", "file a ticket", "I need a ticket
  about X", "turn this into a ticket", or any request to produce a ticket-shaped writeup.
  Always produce the exact format below — short, prose, no bullet points.
sidebar_position: 3
---

# Write Ticket

Partify tickets follow one fixed structure. When asked for a ticket, issue, or bug
report, respond **only** with the ticket in this format — no preamble, no sign-off.

## Format

```
<Title — descriptive yet brief, max 10 words>

Issue Summary:
<one or two sentences naming the problem or request>

Details & Requirements:
<the relevant context, scope, and what needs to be true to call it done>

Expected Behavior:
<what should happen once this is resolved>
```

## Rules

- **No bullet points.** Write every section as short prose, even when listing
  several things — keep them in sentences.
- **Keep it short and to the point.** A few tight sentences per section. Cut
  anything that does not help someone act on the ticket.
- **Title is max 10 words**, descriptive but brief. No "Bug:" or "Ticket:" prefix.
- **Stay factual.** Describe the problem and the desired outcome; don't propose an
  implementation unless the user asked for one.
- If a critical detail is missing (which page, which store, steps to reproduce),
  ask one quick question before writing rather than guessing.

## Example

```
Predictive search dropdown hidden behind footer on mobile

Issue Summary:
On mobile viewports the predictive search results render underneath the footer, so
shoppers can only see the first result or two.

Details & Requirements:
This happens on the US storefront product and collection pages when the search bar is
opened near the bottom of the screen. The dropdown's stacking context needs to sit
above the footer so the full result list is visible and tappable on common mobile
widths.

Expected Behavior:
The full predictive search dropdown appears above all page content, including the
footer, and every result is visible and clickable on mobile.
```
