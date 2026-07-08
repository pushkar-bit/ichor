export async function uploadToCloudinary(fileOrDataUrl: File | Blob | string): Promise<string> {
  const res = await fetch("/api/upload", { method: "POST" });
  if (!res.ok) {
    let errorMessage = "Failed to get Cloudinary upload signature";
    try {
      const errData = await res.json();
      if (errData.error) errorMessage = errData.error;
    } catch {}
    throw new Error(errorMessage);
  }
  const { signature, timestamp, cloudName, apiKey, folder } = await res.json();

  const formData = new FormData();
  formData.append("file", fileOrDataUrl);
  formData.append("api_key", apiKey);
  formData.append("timestamp", timestamp.toString());
  formData.append("signature", signature);
  formData.append("folder", folder);

  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });

  if (!uploadRes.ok) {
    let errMessage = "Failed to upload image to Cloudinary";
    try {
      const uData = await uploadRes.json();
      if (uData.error?.message) errMessage = uData.error.message;
    } catch {}
    throw new Error(errMessage);
  }

  const data = await uploadRes.json();
  return data.secure_url;
}
