<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Fix-it-with-AI prompt

The report page renders a one-click "Fix it with AI" prompt (`FixPrompt` component, built by `buildFixPrompt` in `src/lib/audit/fixPrompt.ts`) so a user can copy every finding, with concrete fixes, straight into an AI coding assistant.

**Requirement:** whenever you extend or change what the report measures or shows — a new check, a new finding property, new metrics, changed confidence/priority semantics, etc. — you MUST revisit `buildFixPrompt` and its `report.fixPrompt` dictionary copy (en + cs, native, no machine translation) so the generated prompt keeps describing everything the report now contains. A report feature that never reaches this prompt is a bug.
