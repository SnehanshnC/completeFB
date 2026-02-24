const IMGBB_API_KEY = process.env.NEXT_PUBLIC_IMGBB_API_KEY!;

export async function uploadToImgBB(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("key", IMGBB_API_KEY);

  const res = await fetch("https://api.imgbb.com/1/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error("ImgBB upload failed");

  const data = await res.json();
  return data.data.display_url;
}
