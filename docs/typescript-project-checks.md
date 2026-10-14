## TypeScript project diagnostics

Open a TypeScript or JavaScript source file and select **Check TypeScript project**
above the editor. Save all workspace edits first. The check uses the nearest
`tsconfig.json` inside the workspace and the project's installed TypeScript
dependency; Node.js must be available. Install missing project dependencies with
your normal project setup workflow.

Results list diagnostic codes, messages, and source locations. Select a location
to open the file at the reported line and column. Run the check again after
editing: results describe the saved files at the last check, not live buffers.
Configuration errors, missing tooling, compiler failures, and timeouts are
reported explicitly. Up to 500 diagnostics are listed; diagnostics outside the
connected workspace are counted without exposing external paths.

Checks run only when requested, do not invoke package scripts, and do not emit
JavaScript or build metadata. The compiler uses the project's include/exclude
rules and follows project references inside the workspace. No dependencies are
downloaded automatically. The existing Monaco syntax service remains enabled;
these project results supplement it.

The same action is available through
`jarvis api agentic-ide check-typescript-project --workspace_id <id>` with a JSON
body containing the relative source `path`.
