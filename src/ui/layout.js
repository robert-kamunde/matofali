/** Largest size with the field's aspect ratio that fits in the box, in whole CSS pixels. */
export function fitField(boxW, boxH, fieldW, fieldH) {
  const w = Math.max(0, boxW);
  const h = Math.max(0, boxH);
  const k = Math.min(w / fieldW, h / fieldH);
  return { width: Math.floor(fieldW * k), height: Math.floor(fieldH * k), scale: k };
}
