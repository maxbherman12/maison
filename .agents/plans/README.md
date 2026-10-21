# Plans

Design and phase plans live here, one file per initiative:

```
.agents/plans/YYYY-MM-DD-<slug>.md
```

A plan should cover:

- The problem and the desired outcome.
- The proposed approach, with enough detail to implement.
- At least one alternative considered and why it was rejected.
- Files/modules affected.
- Acceptance criteria and how the phase will be verified.
- Risks and open questions.

Use a `**Status:**` line at the top (`Draft for review`, `Approved`, `Superseded`) and link related plans. A plan is a design document, not merge approval: each implementation phase still follows the feature workflow in `AGENTS.md` and needs explicit approval before it lands on `main`.
