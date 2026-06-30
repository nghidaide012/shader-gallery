import { setConsoleFunction } from "three";

// R3F v9's store constructs `new THREE.Clock()`, which three r183 deprecated in
// favour of THREE.Timer — emitting a console warning on every Canvas mount.
// It's purely upstream (R3F hasn't migrated) and harmless. three exposes an
// official hook to route its own console output, so we drop just that one line
// and forward everything else untouched. Remove this when R3F drops Clock.
let installed = false;

export function silenceThreeClockWarning() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  setConsoleFunction((type, message, ...params) => {
    if (
      type === "warn" &&
      message.includes("Clock") &&
      message.includes("deprecated")
    ) {
      return;
    }

    const fn =
      type === "error"
        ? console.error
        : type === "warn"
          ? console.warn
          : console.log;

    // Preserve three's own stack-trace formatting for everything we forward.
    const stackTrace = params[0] as
      | { isStackTrace?: boolean; getError?: (m: string) => unknown }
      | undefined;
    if (stackTrace?.isStackTrace && typeof stackTrace.getError === "function") {
      fn(stackTrace.getError(message));
    } else {
      fn(message, ...params);
    }
  });
}
