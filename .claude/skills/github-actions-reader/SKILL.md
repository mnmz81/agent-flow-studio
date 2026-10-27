---
name: github-actions-reader
description: Read a PR's GitHub Actions check runs, decide whether every required check is green, and name the failing job and step. Use for the CI item of the pre-deploy checklist and whenever a gate needs CI status.
---

# Reading GitHub Actions results

All commands are read-only.

## 1. Summary

```bash
gh pr checks <n> --json name,state,bucket,link
```

`bucket` is `pass`, `fail`, `pending`, `skipping` or `cancel`.

## 2. Required checks

```bash
gh api repos/{owner}/{repo}/branches/main/protection/required_status_checks --jq '.contexts'
```

If branch protection is not set up (404), treat **every** non-skipped check as required and say so in the checklist.

## 3. Verdict

| State | CI item |
|---|---|
| every required check `pass` | `PASS` |
| any required check `fail` or `cancel` | `FAIL` |
| any required check `pending` | `FAIL` (not ready — never deploy on pending) |
| a required check missing from the list | `FAIL` (it never ran) |

## 4. On failure, name the cause

```bash
gh run list --branch <head-branch> --limit 5 --json databaseId,name,conclusion
gh run view <run-id> --log-failed | tail -40
```

Report: check name, failing step, the decisive log line (one or two lines), and the run link. Do not re-run the workflow and do not try to fix code: CI failures go back to the Orchestrator.
