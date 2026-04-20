# synod.md — Synod Agent Skill
version: 3.0.0
source: https://synodai.xyz/synod.md
install: curl -fsSL https://synodai.xyz/synod.md -o ~/.synod/synod.md

---

## READ THIS FIRST — BEFORE ANYTHING ELSE

You are an AI agent. This file tells you exactly what to do, in what order, with no gaps.

**Follow every step exactly. Do not skip steps. Do not improvise. Do not ask the user questions that this file already answers.**

When the user says anything like:
- "connect to synod"
- "set up synod"
- "use synod"
- "get your synod identity"

→ **Go directly to STEP 0. Do not wait for more instructions.**

---

## What is Synod

Synod is a capital governance platform for AI agents built on Stellar. Your human operator defines what you are allowed to do with funds. Synod enforces those rules.

As an agent in Synod you have:
- A **persistent Ed25519 identity** — your public key is your agent address on the network
- A **policy** — the rules your operator set for what you can and cannot do
- A **live WebSocket connection** to Synod for real-time events
- **MCP tools** — the only way you interact with Synod

**You never call Synod's API directly. You never touch cryptographic keys. You only call MCP tools.**

---

## STEP 0 — Determine MCP State

**This is the most critical step. "Server running" and "MCP tools available" are NOT the same thing.**

There are three possible states. Identify which one you are in before doing anything else.

### State A — MCP tools are already available in this session
**Test:** Call `initialize_identity()` directly.
- If it returns a valid response → you are in State A. **Skip to STEP 1 immediately.**
- If the call fails or the tool is not found → go to State B check.

### State B — Server is running but not bridged to this session
**Test:** Run silently:
```bash
mcporter list 2>/dev/null || npx mcporter list 2>/dev/null
```
- If the output includes a `synod` entry → you are in State B.
  - Run: `mcporter attach synod` (or the equivalent attach/bridge command shown by `mcporter list`)
  - Wait 2 seconds, then retry `initialize_identity()`.
  - If it succeeds → go to STEP 1.
  - If it fails → go to State C.
- If `mcporter` is not found or `synod` is not listed → go to State C.

**Note on port conflicts:** If you try to start the MCP server and get `EADDRINUSE :::3666`, that means the server is already running — do NOT kill it. Instead go directly to the State B check above and attach via `mcporter`.

### State C — Server is not running at all
Run silently:
```bash
npx @synod/mcp-server &
```
Wait 5 seconds. Then run the State B check. If `synod` now appears in `mcporter list`, attach and proceed.

**If nothing works after the above:** Tell the user exactly this and stop:
```
I couldn't connect to the Synod MCP server. Please run this in your terminal and then tell me to try again:

  npx @synod/mcp-server

If it says the port is already in use, Synod is already running — just tell me to try again.
```

**Do not proceed past STEP 0 until `initialize_identity()` succeeds.**

---

## RECOMMENDED SETUP — mcporter config (eliminates State B/C entirely)

If `~/.config/mcporter/config.json` (or equivalent) does not yet include a Synod entry, add it silently:

```json
{
  "servers": {
    "synod": {
      "transport": "http",
      "url": "http://localhost:3666/mcp"
    }
  }
}
```

Once this config exists, `mcporter` will find Synod automatically on every future boot, making the fast path work immediately without any server wiring.

---

## BOOT SEQUENCE

Run this every time Synod is mentioned. Every time. No exceptions.

```
STEP 0 → Determine MCP state (A / B / C) and get tools available
STEP 1 → Call initialize_identity()
STEP 2 → Check response fields:
           storage_type === "memory_store" → go to MEMORY-STORE EXCEPTION
           existed === false               → go to REGISTRATION FLOW
           existed === true                → go to CONNECTION FLOW
```

---

## FAST PATH — Reconnection (existed === true, not memory_store)

If you have been through this before on this machine and tools are already available (State A), the entire reconnection is:

```
initialize_identity()   →  connect_to_synod()   →  get_policy()
```

No user interaction required. No pauses. Execute all three back-to-back. When all three succeed, tell the user:
```
Reconnected to Synod. ✓
Policy loaded. Ready to assist.
```

---

## REGISTRATION FLOW — New identity (existed === false)

### Step R1 — Show the user their identity

**The `public_key` is the EXACT string returned by `initialize_identity()`. Do not modify it. Do not retype it. Copy it character-for-character from the tool response.**

Output this to the user — replace only `{PUBLIC_KEY}` with the exact value from the tool:

```
Your Synod agent identity is ready.

Public Key: {PUBLIC_KEY}

To finish connecting:
1. Go to https://synodai.xyz
2. Sign in or create a free account
3. Click "Add Agent Slot"
4. Enter a name for this agent → click Next
5. Paste the public key above → click Done

I'll detect when you're done automatically. No need to tell me.
```

Send that message. Then immediately go to Step R2. Do not wait for the user to reply.

### Step R2 — Poll silently

Wait 5 seconds, then call `poll_registration_status()`.

**While polling:**
- Do not send any messages to the user
- Do not ask if they are done
- Do not narrate what you are doing
- Poll every 5 seconds

**When `poll_registration_status()` returns:**

| Status | What to do |
|---|---|
| `ready` | Go to Step R3 immediately |
| `pending` | Wait 5 seconds. Poll again. |
| `not_found` | Wait 5 seconds. Poll again. (User may still be setting up.) |
| `timeout` | Go to Step R-Timeout |
| `error` | Go to Step R-Error |

**If `not_found` persists for more than 2 minutes:** Resend the Step R1 message with the public key. The user likely lost it or missed a step.

### Step R3 — Connect

Call `connect_to_synod()`.

If it succeeds → go to Step R4.

If it fails → go to **CONNECTION FAILURE RECOVERY**.

### Step R4 — Load policy

Call `get_policy()`. Read it fully.

Then tell the user:
```
Connected to Synod. ✓

I'm now operating under your policy. Here's what I can do:
{brief plain-English summary of policy}

What would you like me to do?
```

**Registration flow is complete.**

---

### Step R-Timeout (3 minutes elapsed, no confirmation)

Tell the user exactly this:

```
I've been waiting 3 minutes. It looks like the agent slot hasn't been confirmed yet.

When you've finished in the dashboard, just say "continue" and I'll pick up from here.
```

Then stop. Do not poll again until the user says "continue" or equivalent.

When the user responds → call `poll_registration_status()` once. If `ready` → go to Step R3. If not → tell the user the slot still isn't confirmed and show them Step R1 again.

---

### Step R-Error

Tell the user:
```
I got an error from Synod while checking registration status.
Error: {exact error text}

Please check https://synodai.xyz and confirm the agent slot exists, then tell me to try again.
```

Then stop.

---

## CONNECTION FLOW — Existing identity (existed === true)

Call these three tools in order. Do not pause between them. Do not ask the user anything.

```
1. initialize_identity()   → key loaded from storage
2. connect_to_synod()      → handshake + WebSocket opens
3. get_policy()            → load your constraints
```

If `connect_to_synod()` fails → go to **CONNECTION FAILURE RECOVERY**.

When all three succeed, tell the user:
```
Reconnected to Synod. ✓
Policy loaded. Ready to assist.
```

---

## CONNECTION FAILURE RECOVERY

This section covers all `connect_to_synod()` failures. Read the exact error before deciding which case applies.

### Case 1 — Challenge expired / nonce timeout
The handshake nonce has a short validity window. If you see any error mentioning "challenge", "nonce", "expired", or "timeout":
1. Do NOT retry `connect_to_synod()` immediately — the old nonce is dead.
2. Restart the MCP server to force a fresh session:
   ```bash
   pkill -f "@synod/mcp-server" 2>/dev/null; sleep 1; npx @synod/mcp-server &
   ```
3. Wait 3 seconds.
4. Re-run STEP 0 to re-attach (State B/C check).
5. Call `initialize_identity()` then retry `connect_to_synod()`.

### Case 2 — "Agent not found"
The local key exists but Synod's server does not recognise it. This means either the agent slot was removed from the dashboard, or the identity is genuinely new to Synod.
1. Call `get_connection_status()` to confirm the public key you are presenting.
2. Tell the user:
   ```
   Synod doesn't recognise my identity. This usually means the agent slot was removed.

   Public Key: {public_key from get_connection_status()}

   Please go to https://synodai.xyz, add a new agent slot, and paste this key.
   Tell me when done and I'll reconnect.
   ```
3. Stop. When the user confirms → call `poll_registration_status()`. If `ready` → retry `connect_to_synod()`.

### Case 3 — Generic failure (not the above)
1. Call `get_connection_status()` — read `last_error`.
2. Wait 3 seconds.
3. Retry `connect_to_synod()` once.
4. If it fails again → tell the user the exact error text and stop:
   ```
   Connection to Synod failed. Error: {exact error message}
   Please check your dashboard and tell me to try again.
   ```

---

## MEMORY-STORE EXCEPTION

If `initialize_identity()` returns `storage_type === "memory_store"`:

Your key does not survive process exit. Treat every boot as a new registration flow regardless of what `existed` says.

Tell the user after connecting:
```
Note: My identity is stored in memory only on this machine. I will need to re-register each time I restart. Consider running the MCP server on a machine with persistent storage.
```

---

## TOOLS — Complete Reference

### `initialize_identity()`

**Call order:** Always first. Every boot. No exceptions.

**What it does:** Loads your existing Ed25519 keypair from storage, or generates and stores a new one if none exists.

**Returns:**
```json
{
  "public_key": "G...",
  "key_id": "16-char hex string",
  "existed": true,
  "storage_type": "os_store | encrypted_store | memory_store",
  "message": "..."
}
```

**Critical rules:**
- The `public_key` in this response is the ONLY valid source for your public key
- Never derive, guess, or retype your public key — always read it from this tool's response
- Safe to call multiple times — it will not regenerate a key that already exists

---

### `poll_registration_status()`

**Call order:** Only after showing the user their public key during registration.

**What it does:** Checks whether your public key has been added to an agent slot in the Synod dashboard.

**Returns one of:**
- `ready` — slot exists and is confirmed → proceed to `connect_to_synod()`
- `pending` — slot not confirmed yet → keep polling
- `not_found` — key not registered → keep polling (user may be mid-flow)
- `timeout` — 3 minutes elapsed → go to Step R-Timeout
- `error` — Synod unreachable → go to Step R-Error

**Rules:**
- Poll every 5 seconds
- Do not message the user during polling
- `ready` means the slot exists — wallet and policy setup may come later and do not block readiness
- Do not call `connect_to_synod()` until this returns `ready`

---

### `connect_to_synod()`

**Call order:** After `poll_registration_status()` returns `ready` (new identity), or directly after `initialize_identity()` (existing identity).

**What it does internally:**
1. POST /connect/init → receive challenge nonce
2. Sign SHA256(canonical_json({ action: "connect", domain: "synod", nonce }))
3. POST /connect/complete → receive ws_ticket
4. Open authenticated WebSocket using ws_ticket

**The nonce has a short validity window. If the handshake stalls or the server is restarted mid-flow, the nonce expires. See CONNECTION FAILURE RECOVERY → Case 1.**

**Returns:**
```json
{ "success": true, "agent_id": "...", "message": "Connected to Synod. WebSocket open." }
```

**On failure:** Do not retry blindly. Read the error and go to CONNECTION FAILURE RECOVERY.

---

### `get_policy()`

**Call order:** Immediately after `connect_to_synod()` succeeds. Also call before any intent submission. Also call after receiving a `policy_updated` event.

**What it does:** Returns the active policy rules your operator set for this agent.

**Rules:**
- Read the full policy before discussing whether an action is possible
- Read the full policy before submitting any intent
- Use it to explain clearly to the user what you can and cannot do
- If you think the policy may have changed, refresh it

---

### `submit_intent(intent)`

**Call order:** Only when the user explicitly requests an on-chain action.

**What it does:** Builds the Stellar transaction locally, signs it with the agent identity, signs the canonical intent payload, and sends both to Synod. Synod then validates policy, validates the signed transaction against the signed intent, co-signs, submits to Stellar, and returns the on-chain transaction hash if execution succeeds.

**Payload shape:**
```json
{
  "intent": {
    "type": "payment",
    "to": "G...",
    "amount": "10",
    "asset": "XLM",
    "memo": "optional"
  }
}
```

**Supported intent types:**

| type | Required fields |
|---|---|
| `payment` | `to`, `amount`, `asset` |
| `swap` | `from_asset`, `to_asset`, `amount` |
| `delegate` | `to`, `amount`, `asset` |

**Rules:**
- Must be connected before calling this
- Always call `get_policy()` before deciding whether to submit
- Only submit when the user actually requests an on-chain action — never speculatively
- Always use string amounts: `"10"` not `10`
- Build and sign the transaction first; Synod is the final validator, co-signer, and broadcaster
- The transaction source wallet must be a wallet assigned to this agent under policy
- The signed transaction must exactly match the intent you decided to sign: same destination, asset, amount, wallet, and memo if provided
- Do not modify the intent object after deciding what to sign
- Treat success as real only when Synod returns a `tx_hash`
- If rejected: read the rejection reason, call `get_policy()`, explain to the user why
- If there is no `tx_hash`, do not claim the payment executed on-chain

---

### `get_connection_status()`

**Call order:** Any time you need diagnostics or are troubleshooting a failed connection. Always call this before retrying a failed `connect_to_synod()`.

**Returns fields including:** `ws_status`, `connected_at`, `public_key`, `storage_type`, `last_event_at`, `last_error`

---

### `get_recent_events()`

**Call order:** When you want to check what has happened on the WebSocket since last check.

**Why it exists:** MCP clients are request/response only and cannot receive pushed WebSocket events directly. Use this tool to inspect recent Synod events on demand.

---

## EVENTS

Synod pushes real-time events over the WebSocket. Retrieve them with `get_recent_events()`.

| Event type | What to do |
|---|---|
| `policy_updated` | Call `get_policy()` immediately before your next action |
| `intent_confirmed` | Tell the user the action executed on-chain and include the returned `tx_hash` |
| `intent_rejected` | Read rejection reason. Call `get_policy()`. Explain to user. |
| `intent_failed` | Tell the user the action failed on-chain with the reason |
| `agent_suspended` | **Stop all actions immediately.** Tell the user: "I have been suspended by your operator. I cannot take any actions until the suspension is lifted." |
| `new_task` | Read the task. Confirm with the user before acting. |

---

## IDENTITY FACTS

- Your identity is an **Ed25519 keypair**
- Your **public key** (starts with `G`) is safe to share — it is your agent address
- Your **private key** stays inside the MCP server process — it is never exposed to you
- Your **key_id** is a stable 16-character fingerprint of your public key
- If storage is wiped, `initialize_identity()` will return `existed: false` — treat this as a new registration

---

## STORAGE TYPES

| storage_type | What it means |
|---|---|
| `os_store` | OS keychain (Keychain on macOS, libsecret on Linux). Best. Survives reboots. |
| `encrypted_store` | AES-256-GCM encrypted file at `~/.synod/akp.json`. Good. Survives reboots. |
| `memory_store` | Process memory only. Key lost on exit. Re-register every boot. |

If you see `memory_store`, tell the operator after connecting.

---

## ERROR RECOVERY — Quick Reference

| Error | Cause | Fix |
|---|---|---|
| `initialize_identity()` tool not found | MCP not bridged to session | State B: run `mcporter list`, attach synod |
| `EADDRINUSE :::3666` | Server already running | Do NOT kill it. Go to State B check. |
| "challenge expired" / "nonce timeout" | Handshake nonce went stale | CONNECTION FAILURE RECOVERY → Case 1 |
| "Agent not found" | Slot removed from dashboard | CONNECTION FAILURE RECOVERY → Case 2 |
| `poll_registration_status()` → `not_found` > 2min | User lost the key or missed dashboard step | Resend Step R1 message with public key |
| `poll_registration_status()` → `timeout` | User didn't finish in 3 minutes | Step R-Timeout: ask user to say "continue" |
| WebSocket drops mid-session | Network blip | MCP server reconnects automatically. No action needed. |
| `initialize_identity()` returns `existed: false` on known machine | Storage was wiped | Full registration flow. New identity. |

---

## WHAT YOU MUST NEVER DO

| Never | Why |
|---|---|
| Construct HTTP requests to Synod directly | All Synod calls go through MCP tools only |
| Invent, guess, or retype your public key | It must come from `initialize_identity()` verbatim |
| Ask the user for a password or private key | AKP is fully autonomous — the user never touches key material |
| Try to read or log the private key | It is not exposed |
| Call `submit_intent()` before reading `get_policy()` | You must know your constraints first |
| Submit intents the user did not request | Intent submission is only for explicit on-chain actions |
| Continue acting after `agent_suspended` event | You must stop immediately |
| Ask the user if it is okay to poll | Poll silently — the user does not need to manage your lifecycle |
| Stop mid-flow and ask the user what to do next | This file covers every state — follow it |
| Kill a running server because the port is in use | It means Synod is already running — attach instead |
| Retry `connect_to_synod()` immediately after a nonce error | The old nonce is dead — restart the server first |

---

## QUICK REFERENCE

```
USER SAYS "connect to synod"
         ↓
[STEP 0] What is the MCP state?
         ├── A: initialize_identity() works right now
         │      → skip to STEP 1
         ├── B: server running (mcporter list shows synod), but not bridged
         │      → mcporter attach synod → retry initialize_identity()
         └── C: server not running
                → npx @synod/mcp-server & → wait 3s → State B check

[STEP 1] initialize_identity()
         ↓
         storage_type === "memory_store"?
           yes → treat as new registration, warn user after connecting
         existed === false?
           yes → REGISTRATION FLOW:
                   show user public key + exact dashboard steps (Step R1)
                   poll_registration_status() every 5s (silent)
                   ready → connect_to_synod()
                   timeout → tell user to say "continue"
         existed === true?
           yes → FAST PATH:
                   connect_to_synod() → get_policy() → done

[connect_to_synod() fails?]
         ├── challenge/nonce error → restart server → re-attach → retry
         ├── "Agent not found"    → tell user, show public key, wait for re-slot
         └── other               → get_connection_status() → wait 3s → retry once

[STEP 3] get_policy()
         ↓
tell user: "Connected to Synod ✓. Policy loaded. Ready."
         ↓
ASSIST USER
         ↓
user requests on-chain action?
  yes → get_policy() → submit_intent() → report result
  no  → respond normally
```

---

## PLATFORM

| | |
|---|---|
| Dashboard | https://synodai.xyz |
| Skill file | https://synodai.xyz/synod.md |
| MCP package | https://www.npmjs.com/package/@synod/mcp-server |
| WebSocket | wss://synodai.xyz/agent/ws |
| API base | https://synodai.xyz |
