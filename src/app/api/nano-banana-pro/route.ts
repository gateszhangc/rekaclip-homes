import { getUuid } from "@/lib/hash";
import { db } from "@/db";
import { errorLogs } from "@/db/schema";
import { respErr, respData, respAppError } from "@/lib/resp";
import { AppError, ServiceQuotaExceededError } from "@/lib/errors";
import { getUserUuid } from "@/services/auth_user";
import { getUserCredits, decreaseCredits, CreditsTransType } from "@/services/credit";
import { newStorage } from "@/lib/storage";
import { getIsoTimestr } from "@/lib/time";
import { insertOutfit, OutfitStatus } from "@/models/outfit";
import Replicate from "replicate";
import { createLogger } from "@/lib/logger";

const model = "google/nano-banana-pro";
const log = createLogger("api/nano-banana-pro");
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);
type StorageClient = ReturnType<typeof newStorage>;

const isDataUrl = (value: string) => value.startsWith("data:");

const getRequestOrigin = (req: Request): string | null => {
    const origin = req.headers.get("origin");
    if (origin) {
        return origin;
    }

    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    if (!host) {
        return null;
    }

    const proto = req.headers.get("x-forwarded-proto") ?? "http";
    return `${proto}://${host}`;
};

const resolveImageUrl = (req: Request, value: string): string => {
    if (isDataUrl(value)) {
        return value;
    }

    try {
        return new URL(value).toString();
    } catch {
        const origin = getRequestOrigin(req);
        if (!origin) {
            return value;
        }
        return new URL(value, origin).toString();
    }
};

const getExtensionFromUrl = (value: string): string => {
    const sanitized = value.split("?")[0].split("#")[0];
    const match = sanitized.match(/\.([a-zA-Z0-9]+)$/);
    const extension = match?.[1]?.toLowerCase();
    if (!extension) {
        return "png";
    }
    if (extension === "jpeg") {
        return "jpg";
    }
    if (extension === "png" || extension === "webp" || extension === "jpg") {
        return extension;
    }
    return "png";
};

const getContentTypeForExtension = (extension: string): string => {
    if (extension === "png") {
        return "image/png";
    }
    if (extension === "webp") {
        return "image/webp";
    }
    if (extension === "jpg") {
        return "image/jpeg";
    }
    return "application/octet-stream";
};

const ensureRemoteSourceImage = async (
    input: string,
    req: Request,
    storage: StorageClient,
    batch: string
): Promise<string> => {
    if (!input || isDataUrl(input)) {
        return input;
    }

    const resolvedUrl = resolveImageUrl(req, input);
    let parsed: URL;
    try {
        parsed = new URL(resolvedUrl);
    } catch {
        return resolvedUrl;
    }

    if (!LOCAL_HOSTNAMES.has(parsed.hostname)) {
        return resolvedUrl;
    }

    const extension = getExtensionFromUrl(parsed.pathname);
    const contentType = getContentTypeForExtension(extension);
    const uploadKey = `input/${batch}_source.${extension}`;
    const uploadResult = await storage.downloadAndUpload({
        url: resolvedUrl,
        key: uploadKey,
        contentType,
        disposition: "inline",
    });

    log.info({ resolvedUrl, uploadUrl: uploadResult.url }, "Uploaded local source image");
    return uploadResult.url;
};

export async function POST(req: Request) {
    const requestId = getUuid();

    try {
        // TEMPORARY TEST: Trigger error for DB logging verification
        // throw new Error("DB_LOGGING_VERIFICATION_TEST");

        const body = await req.json();
        const {
            base_image_url,
            image,
            description,
            aspect_ratio,
            resolution,
            resolution_input,
            num_layers,
            go_fast,
            output_format,
            output_quality,
            disable_safety_checker,
        } = body ?? {};

        log.info(
            {
                base_image_url,
                image,
                description,
                aspect_ratio,
                resolution,
                resolution_input,
                num_layers,
                go_fast,
                output_format,
                output_quality,
                disable_safety_checker,
            },
            "nano-banana-pro request received"
        );
        // ------------------------------------------------------------------------------

        const isLayeredRequest = typeof image === "string";
        const sourceImage = isLayeredRequest ? image : base_image_url;

        // sourceImage is optional for text-to-image
        // if (!sourceImage || typeof sourceImage !== "string") {
        //   log.warn({ base_image_url, image }, "invalid base_image_url");
        //   return respErr(isLayeredRequest ? "invalid image" : "invalid base_image_url");
        // }

        // 2. Get user and verify credits
        const user_uuid = await getUserUuid();
        if (!user_uuid) {
            return respErr("User not authenticated");
        }

        const cost = parseInt(
            process.env.NEXT_PUBLIC_OUTFIT_GENERATION_COST || "5"
        );

        const { left_credits = 0 } = await getUserCredits(user_uuid);
        if (left_credits < cost) {
            return respErr("Not enough credits");
        }

        const batch = getUuid();
        const storage = newStorage();
        let resolvedSourceImage = "";

        if (sourceImage && typeof sourceImage === "string") {
            resolvedSourceImage = await ensureRemoteSourceImage(
                sourceImage,
                req,
                storage,
                batch
            );
        }

        const resolvedDescription =
            typeof description === "string" && description ? description : "auto";

        // 5. Generate with google/nano-banana-pro
        const replicateClient = new Replicate({
            auth: process.env.REPLICATE_API_TOKEN,
        });

        log.info({ model }, "Starting AI generation");
        log.info({ prompt: resolvedDescription }, "generation prompt");
        const mockEnvRaw = process.env.MOCK_OUTFIT_GENERATION;
        const mockEnv = (mockEnvRaw ?? "").toLowerCase().trim().replace(/['"]/g, "");
        const useMock = mockEnv === "true" || mockEnv === "1" || mockEnv === "yes";

        log.info({ mockEnv, mockEnvRaw, useMock }, "Mock outfit generation check details");

        const skipUpload = useMock;
        if (useMock) {
            log.info(
                { mock_enabled: true, mock_env: mockEnvRaw },
                "Mock outfit generation enabled"
            );
        }

        let outputUrls: string[] = [];
        let fileExtension = "png";
        let contentType = "image/png";
        const normalizedOutputFormat = "png";

        const resolvedAspectRatio =
            typeof aspect_ratio === "string" && aspect_ratio ? aspect_ratio : undefined;
        const resolvedResolution =
            typeof resolution === "string" && resolution
                ? resolution
                : typeof resolution_input === "string" && resolution_input
                    ? resolution_input
                    : "2K";

        if (output_format && output_format.toLowerCase() !== "png") {
            log.info({ output_format }, "Output format forced to png");
        }

        if (useMock) {
            // Mock implementation
            outputUrls = [
                "https://pub-453ee7f62d7b43479f418b2674b1c1f0.r2.dev/gen/38d63328-01a4-409f-ba65-447a30ffba0c_outfit.png",
            ];
            log.info({ outputUrls }, "Using mock output");
        } else {
            const inputParams: any = {
                prompt: resolvedDescription,
                output_format: normalizedOutputFormat,
                safety_filter_level: "block_only_high",
            };

            if (resolvedSourceImage) {
                inputParams.image_input = [resolvedSourceImage];
                if (resolvedAspectRatio) {
                    inputParams.aspect_ratio = resolvedAspectRatio;
                }
                inputParams.resolution = resolvedResolution;
            } else {
                if (resolvedAspectRatio) {
                    inputParams.aspect_ratio = resolvedAspectRatio;
                }
                inputParams.resolution = resolvedResolution;
            }

            const output = await replicateClient.run(model as any, {
                input: inputParams,
            });

            log.info({ output }, "AI generation output");

            if (!output) {
                throw new Error("No images generated");
            }

            outputUrls = Array.isArray(output) ? output : [output];
        }

        if (outputUrls.length === 0) {
            throw new Error("No images generated");
        }
        // throw new Error("模拟异常");
        const createdAt = getIsoTimestr();
        const outfits: any[] = [];

        for (let index = 0; index < outputUrls.length; index += 1) {
            const outputUrl = outputUrls[index];
            let finalImageUrl = outputUrl;

            if (skipUpload) {
                log.info({ outputUrl }, "Skipping upload in mock mode");
            } else {
                const suffix = `_gen_${index}`; // Simplified naming
                const generatedImageKey = `gen/${batch}${suffix}.${fileExtension}`;

                // 6. Download and upload generated image to R2
                log.info({ generatedImageKey }, "Downloading generated image");

                const uploadResult = await storage.downloadAndUpload({
                    url: outputUrl,
                    key: generatedImageKey,
                    contentType,
                    disposition: "inline",
                });
                finalImageUrl = uploadResult.url;
            }

            const outfitUuid = outputUrls.length === 1 ? batch : getUuid();
            const outfit = {
                uuid: outfitUuid,
                user_uuid,
                created_at: createdAt,
                // If image input existed, use it as base. If not, maybe use the prompt? 
                // Logic from original file used resolvedSourceImage. If text-to-image, it might be empty.
                // If text-to-image, base_image_url can be empty string instead of null to satisfy db schema
                base_image_url: resolvedSourceImage || "",
                img_url: finalImageUrl,
                img_description: resolvedDescription,
                status: OutfitStatus.Active,
            };
            await insertOutfit(outfit);
            outfits.push(outfit);
        }

        // 7. Decrease credits
        await decreaseCredits({
            user_uuid,
            trans_type: CreditsTransType.OutfitGeneration,
            credits: cost,
        });

        // 9. Return response
        const responseBody = {
            outfits,
        };
        log.info({ batch, outputs: outfits.length, user_uuid }, "nano-banana-pro response ready");
        return respData(responseBody);
    } catch (e: any) {
        log.error({ err: e, requestId }, "generate outfit fail");

        // Write to Database Logs (non-blocking)
        try {
            // Try to get user context if possible, silently fail if auth service errors
            const currentUserUuid = await getUserUuid().catch(() => null);

            void db()
                .insert(errorLogs)
                .values({
                    request_id: requestId,
                    user_id: currentUserUuid,
                    api_path: "/api/nano-banana-pro",
                    error_msg: e.message || String(e),
                    stack_trace: e.stack || null,
                })
                .catch((innerError) => {
                    // Fallback if DB logging fails
                    log.error({ innerError }, "Failed to persist error log to database");
                });
        } catch (innerError) {
            // Fallback if auth lookup fails
            log.error({ innerError }, "Failed to gather context for error log");
        }

        // 1. Handle Known AppErrors (direct pass-through)
        if (e instanceof AppError) {
            const resp = respAppError(e);
            // Cannot easily inject into existing response object from helper.
            // We'll construct a new JSON response to include requestId
            return Response.json({
                code: e.code,
                message: e.message,
                requestId
            }, { status: e.statusCode });
        }

        // 2. Handle Replicate specific errors
        const errorMessage = e?.message || String(e);
        const normalizedMessage = errorMessage.toLowerCase();
        if (
            normalizedMessage.includes("flagged") ||
            normalizedMessage.includes("nsfw") ||
            normalizedMessage.includes("safety") ||
            normalizedMessage.includes("content")
        ) {
            return Response.json(
                {
                    code: -1,
                    message:
                        "Content flagged by safety system. Please revise your prompt and try again.",
                    requestId,
                },
                { status: 422 }
            );
        }
        if (errorMessage.includes("402") || errorMessage.includes("Payment Required")) {
            // Log this as a critical error (in real system, trigger alert)
            log.error({ err: e }, "CRITICAL: Replicate Quota Exceeded");
            return Response.json({
                code: -1,
                message: "Service Quota Exceeded: Replicate AI",
                requestId
            }, { status: 402 }); // adhering to ServiceQuotaExceededError status defaults roughly
        }

        // 3. Handle Generic Errors (obfuscate in production)
        // In dev, we might still want to see the message, but let's stick to the secure requirement
        return Response.json({
            code: -1,
            message: "System Error: Please try again later.",
            requestId
        }, { status: 500 });
    }
}
