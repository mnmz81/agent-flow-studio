#!/usr/bin/env node
// Stop hook: CI gate + completion signal validation.
// Foundation layer — pass-through. Full implementation will:
//   1. For Implementation Agent: run lint/build/test ONCE
//   2. For all agents: validate completion signal present (DONE/SRS_READY)
//   3. Validate required outputs (PR URL, coverage %, etc.)

process.exit(0);
