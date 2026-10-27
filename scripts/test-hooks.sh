#!/usr/bin/env bash
# Feed sample payloads to the hooks in .claude/hooks/ and check exit codes.
# Usage: scripts/test-hooks.sh
set -u
cd "$(dirname "$0")/.."
HOOKS=.claude/hooks
fail=0

# expect <exit-code> <hook-file> <json-payload> <label>
expect() {
  out=$(printf '%s' "$3" | node "$HOOKS/$2" 2>&1); code=$?
  if [ "$code" -eq "$1" ]; then echo "PASS  $4"; else echo "FAIL  $4 (exit $code, want $1): $out"; fail=1; fi
}

expect 0 session-start.js '{"hook_event_name":"SessionStart"}' 'session-start exits 0'
node "$HOOKS/session-start.js" </dev/null | node -e '
  const o = JSON.parse(require("fs").readFileSync(0, "utf8"));
  const ctx = o.hookSpecificOutput?.additionalContext ?? "";
  process.exit(o.hookSpecificOutput?.hookEventName === "SessionStart" && ctx.includes("Long-term Memory") ? 0 : 1);
' && echo "PASS  session-start emits hookSpecificOutput.additionalContext" \
  || { echo "FAIL  session-start output not in hookSpecificOutput shape"; fail=1; }

# LTM slice (issue #3): fixture LTM + working memory, injected via env overrides
TMP=$(mktemp -d); trap 'rm -r "$TMP"' EXIT
cat > "$TMP/ltm.json" <<'JSON'
{ "projectMeta": {"stack": "Angular"}, "conventions": {"naming": "kebab-case"},
  "adrs": [ {"id": "ADR-SRS", "agents": ["srs-agent"]}, {"id": "ADR-FORMS", "tags": ["forms"]}, {"id": "ADR-ALL"} ],
  "patterns": [ {"id": "PAT-IMPL-FORMS", "agents": ["implementation-agent"], "tags": ["forms"]}, {"id": "PAT-CHARTS", "tags": ["charts"]} ] }
JSON
echo '{"featureKeywords": ["forms", "validation"]}' > "$TMP/wm.json"
echo '{}' > "$TMP/wm-empty.json"

# slice <wm-file> <payload> -> "<event name>\n<additionalContext>"
slice() { printf '%s' "$2" | LTM_PATH="$TMP/ltm.json" WM_PATH="$1" node "$HOOKS/session-start.js" |
  node -e 'const o=JSON.parse(require("fs").readFileSync(0,"utf8")).hookSpecificOutput; process.stdout.write(o.hookEventName+"\n"+o.additionalContext)'; }
# has/lacks <text> <label> <id>...
has()  { t=$1; l=$2; shift 2; for i; do case $t in *"\"$i\""*) ;; *) echo "FAIL  $l: missing $i"; fail=1; return;; esac; done; echo "PASS  $l"; }
lacks(){ t=$1; l=$2; shift 2; for i; do case $t in *"\"$i\""*) echo "FAIL  $l: leaked $i"; fail=1; return;; esac; done; echo "PASS  $l"; }

out=$(slice "$TMP/wm.json" '{"hook_event_name":"SubagentStart","agent_type":"srs-agent"}')
has   "$out" 'srs slice: own ADR, feature-tag ADR, untagged ADR, conventions' ADR-SRS ADR-FORMS ADR-ALL naming
lacks "$out" 'srs slice: no other agent pattern, no off-feature pattern' PAT-IMPL-FORMS PAT-CHARTS
case $out in SubagentStart*) echo "PASS  SubagentStart event name echoed";; *) echo "FAIL  SubagentStart event name"; fail=1;; esac
out=$(slice "$TMP/wm.json" '{"hook_event_name":"SubagentStart","agent_type":"implementation-agent"}')
has   "$out" 'impl slice: own pattern + shared ADRs' PAT-IMPL-FORMS ADR-FORMS ADR-ALL
lacks "$out" 'impl slice: no srs ADR' ADR-SRS PAT-CHARTS
out=$(slice "$TMP/wm.json" '{"hook_event_name":"SessionStart"}')
has   "$out" 'orchestrator slice: every agent, feature tags only' ADR-SRS ADR-FORMS PAT-IMPL-FORMS ADR-ALL
lacks "$out" 'orchestrator slice: off-feature pattern dropped' PAT-CHARTS
out=$(slice "$TMP/wm-empty.json" '{"hook_event_name":"SessionStart"}')
has   "$out" 'no feature in flight: tagged items kept' ADR-FORMS PAT-CHARTS

expect 2 pre-tool-gate.js "{\"tool_name\":\"Write\",\"tool_input\":{\"file_path\":\"$PWD/.claude/memory/working-memory.json\"}}" 'gate blocks Write to memory'
expect 2 pre-tool-gate.js '{"tool_name":"Bash","tool_input":{"command":"rm -rf build"}}' 'gate blocks rm -rf'
expect 2 pre-tool-gate.js '{"tool_name":"Bash","tool_input":{"command":"git push --force"}}' 'gate blocks git push --force'
expect 0 pre-tool-gate.js '{"tool_name":"Bash","tool_input":{"command":"git status"}}' 'gate allows git status'
expect 0 pre-tool-gate.js '{"tool_name":"Write","tool_input":{"file_path":"/x/src/app.ts"}}' 'gate allows normal Write'

# Memory-gate bypasses (issue #2)
MEM="$PWD/.claude/memory"
expect 2 pre-tool-gate.js "{\"tool_name\":\"Write\",\"cwd\":\"$PWD/src\",\"tool_input\":{\"file_path\":\"../.claude/memory/working-memory.json\"}}" 'gate blocks relative-path Write to memory'
expect 2 pre-tool-gate.js "{\"tool_name\":\"Write\",\"tool_input\":{\"file_path\":\"$PWD/src/../.claude/memory/x.json\"}}" 'gate blocks dot-dot Write to memory'
expect 2 pre-tool-gate.js "{\"tool_name\":\"MultiEdit\",\"tool_input\":{\"file_path\":\"$MEM/working-memory.json\"}}" 'gate blocks MultiEdit to memory'
expect 2 pre-tool-gate.js "{\"tool_name\":\"NotebookEdit\",\"tool_input\":{\"notebook_path\":\"$MEM/n.ipynb\"}}" 'gate blocks NotebookEdit to memory'
expect 2 pre-tool-gate.js '{"tool_name":"Bash","agent_id":"a1","tool_input":{"command":"node scripts/update-working-memory.js {}"}}' 'gate blocks sub-agent memory script'
expect 2 pre-tool-gate.js '{"tool_name":"Bash","agent_id":"a1","tool_input":{"command":"echo {} > .claude/memory/working-memory.json"}}' 'gate blocks sub-agent shell write to memory'
expect 0 pre-tool-gate.js '{"tool_name":"Bash","tool_input":{"command":"node scripts/update-working-memory.js {}"}}' 'gate allows Orchestrator memory script'

# Per-agent Hard Rules (issue #2): write scopes, no Bash for AI Review, no harness self-edits
# scope <exit> <agent> <repo-relative path> [tool]
scope() { expect "$1" pre-tool-gate.js "{\"tool_name\":\"${4:-Write}\",\"agent_id\":\"a1\",\"agent_type\":\"$2\",\"tool_input\":{\"file_path\":\"$PWD/$3\"}}" "$2 ${4:-Write} $3 -> exit $1"; }
scope 0 srs-agent docs/srs/feat-1.md
scope 2 srs-agent src/app/app.ts
scope 0 implementation-agent src/app/login.component.ts
scope 0 implementation-agent e2e/login.spec.ts Edit
scope 2 implementation-agent docs/srs/feat-1.md Edit
scope 0 ai-review-agent CHANGELOG.md
scope 2 ai-review-agent src/app/app.ts
scope 0 devops-agent .github/workflows/deploy.yml
scope 2 devops-agent src/environments/prod.ts
scope 2 srs-agent .claude/agents/srs/SKILL.md Edit
scope 2 Explore CLAUDE.md Edit
scope 2 Explore .claude/settings.json
scope 0 Explore src/app/app.ts
scope 2 Explore .Claude/settings.json            # case-insensitive FS (APFS) reaches .claude/
scope 2 srs-agent ../outside-repo.md               # scoped agents stay in the repo
# abs <exit> <agent|-> <absolute path>: '-' = main session (no agent_id)
abs() { a=''; [ "$2" != - ] && a="\"agent_id\":\"a1\",\"agent_type\":\"$2\","; expect "$1" pre-tool-gate.js "{\"tool_name\":\"Write\",$a\"tool_input\":{\"file_path\":\"$3\"}}" "$2 Write $3 -> exit $1"; }
abs 2 Explore "$HOME/.claude/settings.json"         # global harness, outside the repo
abs 2 Explore /tmp/other-repo/CLAUDE.md
abs 0 Explore /tmp/notes.md                          # unscoped agents may still write elsewhere
abs 2 - "$PWD/.Claude/Memory/working-memory.json"    # memory gate, case-insensitive
expect 2 pre-tool-gate.js '{"tool_name":"Bash","agent_id":"a1","agent_type":"ai-review-agent","tool_input":{"command":"ls"}}' 'ai-review-agent Bash -> exit 2'
expect 0 pre-tool-gate.js '{"tool_name":"Bash","agent_id":"a1","agent_type":"srs-agent","tool_input":{"command":"git log -5"}}' 'srs-agent Bash git log -> exit 0'
expect 0 pre-tool-gate.js "{\"tool_name\":\"Edit\",\"tool_input\":{\"file_path\":\"$PWD/.claude/agents/srs/SKILL.md\"}}" 'Orchestrator/human may edit the harness'

# Destructive-command bypasses (issue #2); built at runtime so this file holds no literal
R=rm; P='git push'
for c in "$R -fr build" "$R -r -f build" "$R -R build" "$R --recursive build" "cd x && $R -rf ." \
         "$P -f" "$P -uf origin main" "$P --force-with-lease" "$P origin +main" "bash -c '$R -rf /tmp/x'"; do
  expect 2 pre-tool-gate.js "{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"$c\"}}" "gate blocks: $c"
done
for c in "$R build/out.js" "$P origin main" "git commit -m 'fix -rf flag'" "npm run format"; do
  expect 0 pre-tool-gate.js "{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"$c\"}}" "gate allows: $c"
done

expect 0 stop-gate.js '{"hook_event_name":"Stop"}' 'stop-gate exits 0'

exit $fail
