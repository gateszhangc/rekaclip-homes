const DEFAULT_IMAGE_MODEL = "nano-banana-pro";
const SUPPORTED_IMAGE_MODELS = new Set(["nano-banana-pro", "seedream-4"]);

const normalizeImageModel = (value?: string | null) => {
  const normalized = (value ?? "").trim().toLowerCase();
  return SUPPORTED_IMAGE_MODELS.has(normalized)
    ? normalized
    : DEFAULT_IMAGE_MODEL;
};

export const getImageModel = () =>
  normalizeImageModel(process.env.NEXT_PUBLIC_IMAGE_MODEL);

export const getImageModelApiPath = () => `/api/${getImageModel()}`;
