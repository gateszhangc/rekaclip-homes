\pset tuples_only on
\pset format unaligned

SELECT current_setting('server_version');

SELECT extname || '|' || extversion
FROM pg_extension
ORDER BY extname;

SELECT count(*)
FROM information_schema.schemata
WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
  AND schema_name NOT LIKE 'pg_toast%'
  AND schema_name NOT LIKE 'pg_temp_%';

WITH expected(schema_name) AS (
  VALUES
    ('ai_expand_image'),
    ('ai_outfit_generator'),
    ('ai_wallpaper_generator'),
    ('animal_generator'),
    ('auth'),
    ('caricature_maker'),
    ('chatgpt_images'),
    ('death_stranding_2'),
    ('deep_art'),
    ('dnd_image_generator'),
    ('domai'),
    ('drizzle'),
    ('easyclaw'),
    ('easyclawmart'),
    ('extensions'),
    ('felixcraft'),
    ('font_finder_from_image'),
    ('game_of_thrones_map'),
    ('gemini_3_flash'),
    ('gothic_ai'),
    ('gpt_image_1_5'),
    ('graphql'),
    ('graphql_public'),
    ('heif_to_jpg'),
    ('image-cropper'),
    ('image_describer'),
    ('image_flipper'),
    ('image_translator'),
    ('invert_image'),
    ('king_3'),
    ('kling_2_6'),
    ('lensgo_ai'),
    ('logo_background_remove'),
    ('ltx_2'),
    ('maintenance_backup'),
    ('nano_banana_pro'),
    ('openclawmarketplace'),
    ('peter_griffin_ai_voice'),
    ('pgbouncer'),
    ('printen_qr_code'),
    ('public'),
    ('qwen_image'),
    ('qwen_image_2512'),
    ('qwen_image_edit'),
    ('qwen_image_layered'),
    ('realtime'),
    ('remove_text_from_image'),
    ('rendernet_ai'),
    ('seedance'),
    ('seedance-15-pro'),
    ('seedance_15_pro'),
    ('seedance_2'),
    ('sharper_image'),
    ('skillhub'),
    ('smmry'),
    ('storage'),
    ('unblur_image'),
    ('vault'),
    ('wan_26')
),
actual(schema_name) AS (
  SELECT schema_name
  FROM information_schema.schemata
  WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
    AND schema_name NOT LIKE 'pg_toast%'
    AND schema_name NOT LIKE 'pg_temp_%'
)
SELECT 'missing|' || e.schema_name
FROM expected e
LEFT JOIN actual a USING (schema_name)
WHERE a.schema_name IS NULL
UNION ALL
SELECT 'unexpected|' || a.schema_name
FROM actual a
LEFT JOIN expected e USING (schema_name)
WHERE e.schema_name IS NULL
ORDER BY 1;
