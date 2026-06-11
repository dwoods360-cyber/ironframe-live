/** Shared ingress escape detection (Secure Terminal + Sentinel instruction). */
export const INGRESS_SHELL_ESCAPE_VECTOR =
  /[;|`$&<>(){}\\\n\r\u0000]|&&|\|\||\$\(|<\s*script|\.\.\//i;

export function containsIngressShellEscapeVector(value: string): boolean {
  return INGRESS_SHELL_ESCAPE_VECTOR.test(value);
}

/** Strip shell metacharacters; collapse repeated whitespace. */
export function neutralizeIngressShellMetachars(value: string): string {
  return value
    .replace(INGRESS_SHELL_ESCAPE_VECTOR, "")
    .replace(/\s+/g, " ")
    .trim();
}
