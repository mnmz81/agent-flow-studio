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
