function looksLikeHeic(file: File): boolean {
  return /heic|heif/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

export async function resizeToDataUrl(file: File, maxWidth = 1500): Promise<string> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // Chrome/Firefox have no built-in HEIC/HEIF decoder (the default format iPhones save
    // photos in), so createImageBitmap rejects on them. Convert via a WASM decoder — running
    // this client-side (vs. a backend route) avoids needing a native libheif build in the
    // serverless deploy, which is a real headache on Vercel.
    if (!looksLikeHeic(file)) {
      throw new Error(`Couldn't read "${file.name}" — this browser can't open that image format. Re-save it as JPEG or PNG and try again.`);
    }
    try {
      // heic2any bundles a ~2020 libheif WASM build that fails on HEIC files from newer
      // iOS versions (they use encoder features it doesn't understand) — heic-to ships a
      // current libheif build and is actively maintained, so it actually decodes them.
      const { heicTo } = await import("heic-to/next");
      const jpegBlob = await heicTo({ blob: file, type: "image/jpeg", quality: 0.9 });
      bitmap = await createImageBitmap(jpegBlob);
    } catch {
      throw new Error(`Couldn't convert "${file.name}" from HEIC — the file may be corrupted. Try a different photo.`);
    }
  }
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width * scale;
  canvas.height = bitmap.height * scale;
  const ctx = canvas.getContext("2d");
  ctx?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.95);
}
