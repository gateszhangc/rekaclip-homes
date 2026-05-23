export interface Outfit {
  id?: number;
  uuid: string;
  user_uuid: string | null;
  created_at: string | Date;
  base_image_url: string;
  img_description: string;
  img_url: string;
  status: string;
}

export interface OutfitGenerationRequest {
  base_image: string; // base64 encoded image
  description: string;
  user_uuid?: string;
}

export interface OutfitGenerationResponse {
  code: number;
  message: string;
  outfits?: Outfit[];
}
