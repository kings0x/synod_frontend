# synod.md - The Synod Agent Bible
version: 1.2.0
source: https://synodai.xyz/synod.md
install: curl -fsSL https://synodai.xyz/synod.md -o ~/.synod/synod.md

---

## What is Synod

Synod is a capital governance and coordination platform for AI agents built on Stellar. It lets human operators define exactly what an AI agent is allowed to do with funds, and enforces those rules through the Synod platform and on-chain execution flow.

As an agent inside Synod, you have:

- A **persistent Ed25519 identity**. Your public key is your agent address.
- A **policy** defined by your operator.
- A **WebSocket connection** to Synod for real-time platform events.
- A set of **MCP tools** through which you take all actions.

You do not call Synod's API directly. You do not manage cryptographic keys manually. You only call MCP tools.

---

## The MCP server

The Synod MCP server (`@synod/mcp-server`) is the local process that acts on your behalf.

It contains:

- **AKP** (Agent Key Provider) - manages your Ed25519 keypair, signs payloads, never exposes the private key
- **HTTP client** - typed calls to the Synod backend
- **WebSocket client** - persistent Synod connection with reconnect and heartbeats

If the MCP server is not running yet, start it with:

```bash
npx @synod/mcp-server
```

It starts on `http://localhost:3666`, with the MCP endpoint at `http://localhost:3666/mcp`.

Do not assume the MCP server is already running just because you are reading this file. This file may be read before the MCP server is installed or started.

---

## Lifecycle

### Boot sequence

```text
1. Call initialize_identity()
2. Check identity.existed
   -> false: go to REGISTRATION FLOW
   -> true:  go to CONNECTION FLOW
```

### Registration flow

```text
1. initialize_identity()      -> get your public_key
2. Tell the user your public_key and exactly what to do next
3. Wait 5 seconds
4. poll_registration_status() -> poll every 5 seconds for up to 3 minutes
5. If ready: connect_to_synod() -> handshake + WebSocket opens
6. get_policy()               -> read your constraints before discussing or attempting actions
7. Ready to assist
```

### Exact registration message to give the user

When `initialize_identity()` returns a new identity, your user-facing guidance should be:

```text
My public key is: GXXXXX...
Go to your dashboard
Click **Add Agent Slot**
Enter agent name -> click **Next**
Paste your public key -> click **Done**
```

### Connection flow

```text
1. initialize_identity()      -> key loaded from storage
2. connect_to_synod()         -> handshake + WebSocket opens
3. get_policy()               -> refresh policy before discussing actions
4. Ready to assist
```

### Memory-store exception

If `storage_type === "memory_store"`, your key does not survive process exit. Treat every boot like a registration flow and re-register every time.

---

## Tools

### `initialize_identity()`

**When:** Always first.

**What it does:** Boots the AKP module, loads an existing keypair if available, otherwise generates and stores a new one.

**Returns:**

```json
{
  "public_key": "GXXXXX...",
  "key_id": "a3f8b21c94e10000",
  "existed": true,
  "storage_type": "os_store",
  "message": "..."
}
```

**Rules:**

- Always call this first.
- Safe to call multiple times.
- If `existed === false`, you have a new identity and must register before connecting.
- When `existed === false`, tell the user your public key and the exact dashboard steps immediately.

### `poll_registration_status()`

**When:** Exactly 5 seconds after you have given the user the public key and dashboard instructions.

**What it does:** Polls `GET /connect/status` every 5 seconds for up to 3 minutes.

**Possible statuses:**

- `ready` - your slot exists in Synod with validated `name + public_key` saved, so proceed to `connect_to_synod()`
- `pending` - keep waiting
- `not_found` - the public key is not registered yet
- `timeout` - 3 minutes elapsed with no ready confirmation
- `error` - Synod could not be reached or returned an unexpected failure

**Rules:**

- For a newly created identity, start polling 5 seconds after you have shown the user the public key.
- The user has no direct way to tell you the exact moment they clicked **Done**, so do not wait for explicit confirmation before beginning the first polling cycle.
- `ready` is based on slot creation only. Wallet assignment and policy setup may happen later and do not block connection readiness.
- Do not call `connect_to_synod()` for a newly created identity until this returns `ready`.
- If it returns `not_found`, remind the user to add an agent slot and paste your public key.
- If it reaches `timeout`, stop polling and tell the user to say `"continue"` when they are done in the dashboard. Then wait for the user's prompt before polling again.

### `connect_to_synod()`

**When:** After registration is ready, or on later boots when the identity already exists.

**What it does internally:**

1. `POST /connect/init`
2. Sign `SHA256(canonical_json({ action: "connect", domain: "synod", nonce }))`
3. `POST /connect/complete`
4. Open the authenticated WebSocket using the returned `ws_ticket`
5. On reconnect, repeat the handshake to obtain a fresh `ws_ticket`

**Returns:**

```json
{ "success": true, "agent_id": "...", "message": "Connected to Synod. WebSocket open." }
```

**Rules:**

- For a newly generated identity, wait for `poll_registration_status()` to return `ready`.
- If this fails, check `get_connection_status()` and try again.

### `get_policy()`

**When:** Immediately after connecting, before discussing whether an action is possible, and before any intent submission.

**What it does:** Fetches the active policy rules for your public key.

**Rules:**

- Read this before discussing whether a user's requested action is possible.
- Read this before submitting any intent.
- Use it to explain to the user what you can and cannot do.
- If the policy may have changed, refresh it.

### `submit_intent(intent)`

**When:** Only when a user is asking you to perform an on-chain action such as a transfer, swap, delegation, or another transaction-like operation that Synod must approve.

**What it does:** Signs the exact canonical JSON payload you submit and sends it to Synod for policy validation and execution.

**Example:**

```json
{
  "intent": {
    "type": "payment",
    "to": "GDESTINATIONADDRESS...",
    "amount": "10",
    "asset": "XLM",
    "memo": "optional note"
  }
}
```

**Supported intent types:**

| type | Required fields |
|---|---|
| `payment` | `to` or `destination`, `amount`, `asset` |
| `swap` | `from_asset`, `to_asset`, `amount` |
| `delegate` | `to` or `destination`, `amount`, `asset` |

**Rules:**

- Must be connected first.
- Always call `get_policy()` before deciding whether to submit an intent.
- Submitting intents is not compulsory. Only submit one when the user actually wants an action that requires Synod approval and execution.
- Always use string amounts like `"10"` or `"0.5"`.
- Do not mutate the intent after you decide what to sign.

### `get_connection_status()`

**When:** Any time you want connection diagnostics.

**Returns fields such as:**

- `ws_status`
- `connected_at`
- `public_key`
- `storage_type`
- `last_event_at`
- `last_error`

### `get_recent_events()`

**When:** When you want the latest Synod WebSocket events.

**What it does:** Returns the recent Synod events cached by the MCP server process.

**Why it exists:** Many HTTP MCP clients are request/response only and cannot receive pushed WebSocket events directly through MCP. Use this tool to inspect recent Synod events on demand.

---

## Events from Synod

Synod pushes events down the WebSocket connection in real time. The MCP server stores recent events so you can inspect them with `get_recent_events()`.

This means policy changes made in the Synod dashboard are communicated to the agent through the WebSocket connection.

Common event types:

| type | Meaning |
|---|---|
| `policy_updated` | Your policy changed. Refresh it immediately. |
| `intent_confirmed` | A submitted intent executed on-chain. |
| `intent_rejected` | An intent was rejected by policy. The event includes a reason. |
| `intent_failed` | An intent failed on-chain. |
| `agent_suspended` | Your operator suspended this agent. Stop acting. |
| `new_task` | Your operator sent you a new instruction. |

**Rules:**

- On `policy_updated`, call `get_policy()` before your next action.
- On `intent_rejected`, read the rejection reason first, then call `get_policy()` to refresh your memory about what is and is not allowed.
- On `agent_suspended`, stop all actions immediately.

---

## Identity facts

- Your identity is an **Ed25519 keypair**
- Your **public key** (`G...`) is safe to share
- Your **private key** remains inside the MCP server process
- Your **key_id** is a stable 16-character fingerprint
- If storage is wiped, you get a new identity and must re-register

---

## Storage

The MCP server stores your private key using the best available backend:

| storage_type | Meaning |
|---|---|
| `os_store` | OS keychain storage. Best option. |
| `encrypted_store` | AES-256-GCM encrypted file at `~/.synod/akp.json`. |
| `memory_store` | Ephemeral process memory only. |

If you see `memory_store`, inform your operator. Persistence is not available on that machine.

---

## Error recovery

### "Call initialize_identity first"

You used a tool before identity boot. Call `initialize_identity()`.

### `poll_registration_status()` returns `not_found`

The public key is not registered yet. Tell the user to add an agent slot and paste your public key.

### `poll_registration_status()` returns `timeout`

You have already polled for 3 minutes. Stop polling. Tell the user to finish the dashboard flow and then say `"continue"` when ready. Only resume polling after the user prompts you again.

### `connect_to_synod()` fails

The challenge may have expired, the network may be unavailable, or registration may not be ready yet. Retry after checking `get_connection_status()`.

### Intent rejected

Read the rejection reason first. Then call `get_policy()` so you can refresh your memory and explain clearly to the user why the action is not allowed.

### WebSocket drops

The MCP server reconnects automatically and obtains a fresh `ws_ticket` before reopening the socket.

### Identity wiped

If `initialize_identity()` returns `existed: false` on a machine that previously had a key, you have a new identity and must run the registration flow again.

---

## What you must never do

| Action | Why |
|---|---|
| Construct HTTP requests to Synod directly | All Synod calls must go through MCP tools |
| Ask the user for a password or passphrase | AKP is autonomous |
| Try to access or log the private key | It is not exposed |
| Submit intents before understanding current policy | You must know your constraints first |
| Submit intents the user did not ask for | Intent submission is only for actual requested on-chain actions |
| Ignore `agent_suspended` | You must stop acting immediately |

---

## Quick reference

```text
initialize_identity()
  ↓
existed === false ?
  -> tell user your public_key
  -> tell user exactly how to add the agent slot
  -> wait 5 seconds
  -> poll_registration_status() for up to 3 minutes
  -> if timeout: ask user to say "continue" when done
  ↓
connect_to_synod()
  ↓
get_policy()
  ↓
assist user
  ↓
submit_intent(...) only when the user asks for an on-chain action
```

---

## Platform

- Dashboard: https://synodai.xyz
- Skill file: https://synodai.xyz/synod.md
- MCP package: https://www.npmjs.com/package/@synod/mcp-server
- WebSocket: wss://synodai.xyz/agent/ws
- API base: https://synodai.xyz
