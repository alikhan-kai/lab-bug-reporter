/**
 * The address sdk.js was loaded from. The service serves sdk.js itself, so this is also where its API and the
 * widget's fonts live. document.currentScript is only set while the script first runs, so it is read once here,
 * when the bundle loads.
 */
export const SCRIPT_URL: string | undefined = readScriptUrl();

function readScriptUrl(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const script = document.currentScript as HTMLScriptElement | null;
  return script?.src || undefined;
}

/** An address next to sdk.js, or undefined when the script's address is unknown. */
export function resolveNextToScript(path: string): string | undefined {
  if (!SCRIPT_URL) return undefined;
  try {
    return new URL(path, SCRIPT_URL).toString();
  } catch {
    return undefined;
  }
}
