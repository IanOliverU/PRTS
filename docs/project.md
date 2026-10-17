# About PRTS

PRTS stands for **Primitive Rhodes Island Terminal Service**. It is currently a personal project, focused first on a Windows coding workspace and the Priestess assistant identity.

## Why this project exists

I have been thinking about building PRTS since July. For now, I am developing it for my own use: a place to discuss a task, work with a connected coding agent, review changes and verify the result. A small tester alpha may follow once the everyday workflow and installation are dependable.

The longer-term direction includes a Priestess companion connected to the same workspace. The current mascot, animated greetings and startup narration are presentation features; they do not mean that the later companion, conversational voice or memory integration is complete.

## Foundation and thanks

PRTS is a personal fork of [Dodaios](https://github.com/Dodaios/Dodaios), built on its desktop application, agentic IDE and agent infrastructure. The upstream foundation was already substantial before this fork began. PRTS changes the product identity and develops its own workflow improvements on top of that code.

Thank you to the Dodaios maintainers and contributors for making their work available. Their engineering, documentation and open-source contributions made this starting point possible. Upstream authorship and contribution history remain credited; PRTS does not claim to have created the inherited foundation.

This fork is independently maintained. It is not an official Dodaios release, and no upstream endorsement is implied. Project-specific questions belong in the [PRTS issue tracker](https://github.com/IanOliverU/PRTS/issues).

## Names and compatibility

The product and IDE display name is PRTS. The lead assistant identity is Priestess. Light mode is the default; explicit saved appearance choices and dark mode remain supported.

Some names intentionally remain unchanged: Python imports and package identifiers, existing CLI aliases, configuration files, credential stores, data paths, plugin namespaces, MCP server names and guide URLs. These are compatibility contracts for existing installations. External Dodaios services and registries keep their actual names and addresses. Historical records and source-attribution statements retain their original provenance.

Public project documentation, shared-image links and GitHub feedback point to PRTS. The inherited updater identity is separate and is not migrated by a display-name change. There is no supported packaged PRTS release or one-line installer yet.

## License and attribution

The upstream [Apache License 2.0](../LICENSE) and [NOTICE](../NOTICE) are retained. Earlier upstream releases through 1.6.0 retain their original MIT license. Third-party code and assets keep their own licenses and notices; see [licensing details](licensing.md) and `third_party/`.

PRTS modifications include project diagnostics and Git-review improvements, product identity assets and naming, mascot and guide presentation, the startup intro and narration, responsive startup layout, and the light appearance default. This page records the fork's project context without replacing the original notices or historical changelog.
