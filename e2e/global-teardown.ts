import { teardownRuntime } from "./helpers/process-runtime"

export default async function globalTeardown() {
  await teardownRuntime()
}
