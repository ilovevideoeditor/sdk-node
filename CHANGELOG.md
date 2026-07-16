# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] - 2026-07-16

### Added

- `reviewWorkflowStep(runId, stepId, { action, variables? })` — approve or reject a paused human-in-the-loop review step; approving resumes the run, rejecting cancels it.
- `review` workflow step type (`WorkflowStepType`) and `waiting_review` run status for workflows that pause for human approval.
- Custom credit top-up: `/billing/checkout` accepts `amountEur` (€10–€2500) with `mode=payment`.

## [1.0.1] - 2026-07-14

### Changed

- Documentation and package metadata improvements; no functional changes.

## [1.0.0] - 2026-07-14

### Added

- Initial public release.

[1.0.2]: https://github.com/ilovevideoeditor/sdk-node/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/ilovevideoeditor/sdk-node/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/ilovevideoeditor/sdk-node/releases/tag/v1.0.0
