export async function copyPageURL() {
  try {
    await navigator.clipboard.writeText(window.location.href);
  } catch {
    // Clipboard permission can be unavailable in an embedded or non-secure context.
  }
}
