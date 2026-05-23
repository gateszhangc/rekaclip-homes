import { getUuid } from "@/lib/hash";
import { respErr, respData } from "@/lib/resp";
import { replicate } from "@ai-sdk/replicate";
import { experimental_generateImage as generateImage } from "ai";
import { insertWallpapers, WallpaperStatus } from "@/models/wallpaper";
import { getIsoTimestr } from "@/lib/time";
import { newStorage } from "@/lib/storage";

const model = "black-forest-labs/flux-schnell";

export async function POST(req: Request) {
    try {
        const { description, user_uuid } = await req.json();

        if (!description) {
            return respErr("Description is required");
        }

        const imageModel = replicate.image(model);
        const providerOptions = {
            replicate: {
                output_quality: 90,
            },
        };
        const prompt = `generate  a wallpaper with the following description:${description}`


        const { images, warnings } = await generateImage({
            model: imageModel,
            prompt: prompt,
            n: 1,
            providerOptions,
            aspectRatio:'16:9'
        });

        if (warnings.length > 0) {
            throw new Error("generate wallpaper failed")
        }

        const batch = getUuid();

        const provider="replicate";

        // 1. 先保存图片文件
        const wallpapers = await Promise.all(
        images.map(async (image, index) => {
            const fileName = `${provider}_image_${batch}_${index}.png`;
            const key = `gen/${fileName}`;
            const buffer = Buffer.from(image.base64, "base64");
            const storage = newStorage();
            const res = await storage.uploadFile({
                body: buffer,
                key,
                contentType: "image/png",
                disposition: "inline",
            });
            console.log("upload file success:", res);

            // 使用 storage 返回的 URL，如果有 STORAGE_DOMAIN 则使用，否则使用 location
            const url = `${process.env.STORAGE_DOMAIN}/${key}`;
            return {
                uuid: getUuid(),
                created_at: getIsoTimestr(),
                img_description: description,
                img_url: url,
                user_uuid: user_uuid || null,
                status: WallpaperStatus.Active
            };
        })
        );

        // 2. 批量保存到数据库
        await insertWallpapers(wallpapers);

        return respData({
            prompt: prompt,
            wallpapers: wallpapers
        });
    } catch (e) {
        console.log("generate wallpaper fail: ", e);
        return respErr("generate wallpaper fail");
    }
}