# **App Name**: Quizierra

## Core Features:

- Exam Runner: A distraction-free exam interface with a server-authoritative timer and question display.
- Autosave: Autosaves user's responses to IndexedDB and synchronizes with the server, resolving conflicts deterministically using merge modal tool when changes are identified.
- Question Editor: A WYSIWYG editor that allows instructors to create and modify questions with Markdown and LaTeX support.
- Hints: Provides hints to students during the exam via an adapter that filters for disallowed output such as formulas or code execution constructs.
- Proctoring: Allows proctors to monitor students during the exam with real-time video and event flagging, capturing events such as focus lost and tab switching.
- Gamification: Assembling car parts for right answers in an animated UI; awards parts for right answers in a quiz attempt.
- Authentication and Authorization: Manages user sessions and ensures that all actions are performed by a user with necessary permissions through role based authentication. This includes short-lived access tokens and rotating refresh tokens for optimal security.

## Style Guidelines:

- Primary color: Deep Midnight (#0B1226) for headers and main chrome in dark mode.
- Accent color: Electric Teal (#00C2A8) for primary buttons and active states. To generate excitement about exams.
- Background color: Soft Ivory (#FAFBFD) for a clean, light background in light mode.
- Text color: Slate Gray (#6B7280) for readable text against light backgrounds. Selected for clarity.
- Warning color: Warm Amber (#FFB020) for warnings and alerts. To create a sense of awareness.
- Headline font: 'Inter' sans-serif SemiBold 600 for headlines. Selected for modernism and readability.
- Body font: 'Inter' sans-serif Regular 400 for body text. Selected for clear legibility.
- Code font: 'JetBrains Mono' monospace for code snippets. To enable a consistent width with easy to differentiate characters.
- Use minimal line icons with filled glyphs for critical actions.
- Employ subtle easing animations (120–160ms) with micro-animations for autosave ticks and submissions. Enhancing the user experience and providing feedback through visual movement.
- Use a 12-column grid layout; for ExamRunner, use a two-column layout: 68% for the question pane, 32% for the timer, navigator, and flags sidebar. Optimizing responsiveness across devices.
