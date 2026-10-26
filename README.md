# PRTS

**Primitive Rhodes Island Terminal Service**

PRTS is my personal project: a Windows-first coding workspace with Priestess as its assistant identity. I have been thinking about building it since July, and I am developing it for my own daily work before considering a wider release.

PRTS is a personal fork of [Dodaios](https://github.com/Dodaios/Dodaios), built on its existing desktop application, agentic IDE and agent infrastructure. It is not built from scratch. This fork is independently maintained and is not an official Dodaios release or an endorsed project.

## Current focus

- Open projects, work with connected coding agents, inspect changes and run project checks.
- Improve everyday editing, project diagnostics, selective staging and recovery.
- Apply the PRTS identity, Priestess mascot and startup presentation, with light mode as the default and dark mode still supported.
- Validate real Windows workflows before preparing an IDE alpha for testers.

The workspace keeps the inherited Monaco editor and backend. Desktop companion integration, expanded memory and conversational character behavior are later work. Inherited features are not all verified for this fork; the presence of a feature does not establish release readiness.

## Development status

This is currently a personal development project, not a packaged PRTS release. Clean-machine installation, native input, debugging, update recovery and broader project workflows still need validation. There is no supported PRTS one-line installer or published desktop download yet.

For development, clone this repository and follow [the development setup](CONTRIBUTING.md). The Windows launcher is `run.bat`. For an isolated development instance, use `python -m jarvis.ui.web.launcher --instance dev`; `run.bat --dev` instead selects the Vite frontend. Existing Python package, CLI, configuration and data identifiers remain compatible with the inherited installation. Do not assume an upstream Dodaios installer or PyPI package installs this fork.

The inherited updater and external service integrations have their own source identities. PRTS documentation and feedback link to this repository; changing display branding does not migrate an installed update channel or publish a release.

After the development environment is installed, the inherited command alias also starts the desktop app:

```powershell
jarvis # Start the PRTS desktop app
```

## Documentation

- [Project background and upstream credit](docs/project.md)
- [Application guide](docs/product/start-here/welcome-to-dodaios.md)
- [Agentic IDE guide](docs/product/extend-and-automate/agentic-ide.md)
- [Architecture](docs/architecture-overview.md)
- [Development and contribution](CONTRIBUTING.md)
- [Agent instructions](AGENTS.md)
- [Issues](https://github.com/IanOliverU/PRTS/issues)

Some guide filenames, commands and internal identifiers retain earlier names for compatibility. Historical release notes describe upstream releases, not releases published by PRTS.

## Thanks and credits

Thank you to the Dodaios maintainers and contributors for building and sharing the foundation that makes this project possible. PRTS builds on their work, and the inherited history, licenses and attribution remain part of this repository.

- **Upstream project:** [Dodaios](https://github.com/Dodaios/Dodaios)
- **Upstream contributors:** [contributor history](https://github.com/Dodaios/Dodaios/graphs/contributors)
- **Licenses and notices:** [LICENSE](LICENSE), [NOTICE](NOTICE), [licensing details](docs/licensing.md), and the component notices under `third_party/`.

### Upstream contributor acknowledgments

<!-- contributors:start -->

<a href="https://github.com/rubenluetke10-beep"><img src="https://avatars.githubusercontent.com/u/226271791?v=4&s=48" width="48" height="48" alt="rubenluetke10-beep"></a> <a href="https://github.com/CodeByPeace"><img src="https://avatars.githubusercontent.com/u/228503734?v=4&s=48" width="48" height="48" alt="CodeByPeace"></a> <a href="https://github.com/Uddoo"><img src="https://avatars.githubusercontent.com/u/19704816?v=4&s=48" width="48" height="48" alt="Uddoo"></a>

<!-- contributors:end -->

## License

This fork retains the [Apache License 2.0](LICENSE) and the upstream [NOTICE](NOTICE). Historical upstream releases through 1.6.0 retain their original MIT license. Bundled components and assets retain their respective licenses and attribution; see [licensing details](docs/licensing.md).
