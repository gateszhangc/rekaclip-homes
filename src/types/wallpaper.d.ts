export interface Wallpaper {
  id?: number;
  uuid?: string;
  user_uuid?: string | null;
  created_at?: Date | string | null;
  img_description?: string | null;
  img_url?: string | null;
  status?: string | null;
}
