/**
 * Export the canvas as a PNG the browser downloads directly.
 *
 * The canvas is created with `alpha: false` and its background is painted, so
 * the exported image already has the palette's backdrop baked in — no
 * compositing step and no transparent screenshots.
 */
export function downloadCanvasPng(canvas: HTMLCanvasElement, filename: string): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
    link.click();
    // Give the browser a turn to start the download before revoking.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
}

/** Timestamped, filesystem-safe name so repeated exports do not collide. */
export function exportFilename(prefix: string, detail: string): string {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const slug = detail.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
  return `${prefix}-${slug}-${stamp}.png`;
}
