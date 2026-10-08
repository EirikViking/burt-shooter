# Codex Windows permissions mismatch — observed runtime evidence

Read-only investigation on 2026-10-02, thread `01a0ec1e-e5fb-7710-98df-2993049c9c09`. No global settings, application databases, security rules or project location changed. No secrets exported. Times below are UTC; Oslo is UTC+2.

## Finding during the earlier restricted execution

The stored conversation settings correctly select Full access. The already-running turn still uses its earlier restricted policy. This is a stored-settings versus active-turn mismatch, not evidence that all ordinary E: writes are prohibited.

Actual active turn: `01a0fa4e-457d-78d0-a63a-87832ca0c35a`, started at 08:58. Runtime context and subsequent runtime feedback retain `workspace-write`, `approval_policy: on-request`, `approvals_reviewer: auto_review`, `network_access: false`. Conversation settings subsequently record `never`, reviewer `user`, disabled permission profile and active `:danger-full-access` at 10:45:20. The source implementation of the stale snapshot has not been inspected; do not claim a particular internal bug or that it is fixed.

## Exact references

- `C:/Users/cromk/.codex/sessions/2026/09/29/rollout-2026-09-29T09-44-03-01a0ec1e-e5fb-7710-98df-2993049c9c09.jsonl`: line13283 (08:58:31 active restricted context), line13933 (10:45:20 restricted context), line13934 (same timestamp, thread_settings_applied Full access).
- `C:/Users/cromk/.codex/logs_2.sqlite`, read-only `logs.id=539531533` (10:45:20) and `539535463` (10:53:22): active turn still logs OnRequest/WorkspaceWrite/network_access=false after Full access was stored. Row539531532 names the continuing original turn. Row539534593 (10:52:44) records a steering TurnInput with every permissions override None.
- `C:/Users/cromk/.codex/state_5.sqlite`, read-only `threads.id=01a0ec1e-e5fb-7710-98df-2993049c9c09`: sandbox_policy `{"type":"disabled"}`, approval_mode `never`, model gpt-6-astra, CLI0.158.0-alpha.2.1. This stored row does not establish the policy used by the ongoing tool execution.

## Latest Steam dialog

Rollout line13879, 10:37:03, call `call_tEDzTAZAQF3jddrul0hOXeva`: `exec_command` explicitly requested `sandbox_permissions: require_escalated`. Action: cached SteamCMD authenticated `+app_info_update 1 +app_info_print 4765070 +quit`; account name omitted here. Justification: "Allow the already-authorized authenticated Steam connection outside the restricted network sandbox after the standard attempt failed with No Connection?"

The preceding standard call exited5 (rollout13866), with failed HTTP manifest requests and No Connection (rollout13875, SteamCMD bootstrap log at12:34:06 local). Thus the reason for the Steam escalation was a reproduced restricted-network failure, not an inferred disk-permission failure.

`logs_2.sqlite` row539525963, 10:37:32: ExecApproval `exec-eba946b5-3d23-4631-bc10-a009bb3dffbf`, decision Approved, original active turn. The authenticated retry completed exit0 (rollout13900). No denial/rationale is recorded for this event.

## Earlier local-build dialog

Rollout13727, 09:57:21, call `call_wBuD4D4qUyIQSstXaYULVB9e`, used default access. Its command combined audited recursive Remove-Item of `E:/Codex/tmp/nova-rescue-batch/package-source` and `E:/Codex/builds/nova-swarm/rescue-batch/win-unpacked` with rebuild/package commands.

Desktop log `C:/Users/cromk/AppData/Local/Codex/Logs/2026/10/02/codex-desktop-52ba64b5-4960-48f7-b659-e56d4f564a2c-15692-t0-i1-000008-0.log`, lines6533–6536: request686, commandExecution, permission notification at09:57:22.548. `logs_2.sqlite` row539506967 at10:07:16: ExecApproval `exec-db63596c-d7ce-4ac2-8c39-d7b93e53315b`, Approved. The stop was waiting for approval, not an explicit rejection. No separate rationale text was captured. Recursive deletion was present in the reviewed action; attributing the dialog specifically to deletion is an inference. This is the last recorded Windows notification, not proof that no later in-app dialog appeared.

## Actions and limits

Standard-access unique E: file create/read/delete probe passed earlier. New standard-access directories `E:/Codex/builds/nova-swarm/rescue-delivery-20261002-becefac7` and `E:/Codex/tmp/rescue-delivery-20261002-becefac7` were successfully created at10:53:22.440 current source/native/audio hashes and copied verified bundle entry hash pass. No existing output/temp directory is being cleaned; the previous packaging process was intentionally cancelled and its partial output preserved.

A fresh execution in this same conversation should be checked for the stored Full access profile before assuming autonomous network access. Ending the old execution and starting a new one is a recovery hypothesis, not a verified repair. Do not rewrite config.toml, requirements, databases or global security settings to force it. If a fresh turn remains restricted, the recorded mismatch is suitable for an application bug report; do not claim an unverified fix or bypass a rejection.

Official expected mapping: [OpenAI sandbox documentation](https://learn.chatgpt.com/docs/sandboxing): Full access is danger-full-access plus never; automatic review does not remove the sandbox boundary. The observed logs, rather than these docs or config.toml, establish this session's actual mismatch.

## Verified recovery in the next execution

Fresh rollout line14141 at10:59:44.477Z records `approval_policy: never`, reviewer `user`, sandbox `danger-full-access`, same D: checkout. The fresh standard SteamCMD authenticated read (exec session50523, no sandbox_permissions override) completed exit0 without an approval dialog, producing `E:/Codex/builds/nova-swarm/rescue-delivery-20261002-becefac7/steam-before.json`: public/private25671489, test-build23782673 and the same Cloud hash. Local packaging continues under standard access. This verifies recovery for the new execution; it does not prove an app update or global configuration change fixed the underlying propagation behavior. No such change was made.

## Fresh confirmation at 11:32–11:39 UTC (13:32–13:39 Oslo)

Re-read the actual rollout and runtime SQLite logs, not only this report or config.toml. Rollout line14413 at11:32:04.896Z still records `danger-full-access`, `approval_policy: never`, reviewer `user`, turn `01a0fc45-220a-7f41-be9c-da538031593a`. Runtime `logs_2.sqlite` rows539568233 through539569870 independently report `approval_policy=Never sandbox_policy=DangerFullAccess` between11:33:27 and11:36:56. Reviewer `user` does not cause prompts while approval policy is `never`.

The original Steam escalation was re-read at rollout13879: `call_tEDzTAZAQF3jddrul0hOXeva`, `tools.exec_command`, executable `E:/dev-cache/steamcmd-nova/steamcmd.exe`, arguments `+login [account redacted] +app_info_update 1 +app_info_print 4765070 +quit`, explicit `sandbox_permissions: require_escalated`. Its recorded justification was: “Allow the already-authorized authenticated Steam connection outside the restricted network sandbox after the standard attempt failed with No Connection?” Runtime row539525963 confirms Approved at10:37:32. No security rejection was bypassed.

Two new standard-access tests succeeded with **no sandbox_permissions field**:

- At11:34:42, created with CreateNew, read back and deleted only `E:/Codex/tmp/nova-permission-probe-12841173-f45d-4346-9d0c-bd6207e53115.txt`. Ancestors checked for reparse points; exit0, verified absent afterward.
- Exec session11426 ran `E:/dev-cache/steamcmd-nova/steamcmd.exe +login anonymous +app_info_update 1 +app_info_print 4765070 +quit`. Connecting, client config and user info each returned OK, App4765070 was returned, and SteamCMD exited0 without approval. TEMP/TMP were process-local `E:/Codex/tmp/nova-permission-network-20261002-dad8d12f`; Steam cache/logs stayed under `E:/dev-cache/steamcmd-nova`. This anonymous connectivity probe changes no Steam branches/settings and is not an authenticated publisher test; the earlier authenticated read/upload receipts establish that separate behavior.

No user setting needs changing for the present execution. The observed recovery was adoption of Full access in a new execution after an old execution retained its previous permissions. The exact internal application defect and permanent recurrence prevention remain unproven. If it recurs, compare the fresh active turn_context with thread_settings_applied; changing global security settings or repeatedly requesting escalation is not a repair. Application databases and global settings remain untouched. An initial direct log read hit a file-sharing lock; opening the same log read-only with FileShare.ReadWrite succeeded. That lock was not a sandbox denial.
