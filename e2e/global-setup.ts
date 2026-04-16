import { prepareInfrastructure, startRuntimeProcesses } from "./helpers/process-runtime"

export default async function globalSetup() {
  await prepareInfrastructure()
  await startRuntimeProcesses()
}
