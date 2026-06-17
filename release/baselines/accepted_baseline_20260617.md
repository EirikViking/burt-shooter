# Accepted Nova Swarm Baseline - 2026-06-17

- Accepted BuildID: `23779737`
- Accepted source commit: `136762d2858501cfd4d2787a01296661e11d3469`
- Decision: build forward from this source; do not perform a broad revert.
- Steam builds back to June 12 were tested against BuildID `23779737`; no meaningful performance difference was found.
- Performance rescue included: yes, commit `26f6712e7acf4ecc60a3dafda7b3e77382209877`.
- Small enemy gating included: yes, commit `136762d2858501cfd4d2787a01296661e11d3469`.
- Ignored BuildIDs: `23768418` is not the accepted baseline; `23773181` was an intermediate rescue candidate.
- Future instruction: do not reopen a broad performance panic without a concrete repro.
- Rollback note: if needed, use Steamworks to assign an older known-good BuildID to the affected branch.
