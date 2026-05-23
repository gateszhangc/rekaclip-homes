---
name: r2-image-offloader
description: Offload large local images from public/ and tasks/ to Cloudflare R2, rewrite image references in code/docs, update .gitignore, and remove images from git tracking to speed up git push. Use when repository size or git push is slow due to image assets, or when migrating project image hosting to R2/Cloudflare.
---

# R2 Image Offloader

## Overview

Move local image assets to Cloudflare R2 and switch all references to public URLs, then untrack or delete local files so the repository stays small and git push stays fast.

## Workflow

1. Verify R2 configuration is available in environment variables:
   - `STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_DOMAIN`

2. Upload task images and rewrite `tasks/task.md`:
   - Run `npx tsx scripts/upload-task-images.ts` from the project root.
   - Use `--dry-run` first if you want to preview changes.

3. Upload public images and rewrite references:
   - Run `npx tsx scripts/upload-public-images.ts` from the project root.
   - This updates references in code, docs, and JSON.

4. Fix dynamic or template-string references missed by bulk replacement:
   - Search for remaining local paths with `rg --pcre2 -n "\"/(?!_next|api)[^\"]+\\.(png|jpg|jpeg|gif|webp|svg|ico|avif)\""`.
   - Replace dynamic paths (e.g., `/examples/${id}.webp`) with full R2 URLs.

5. Prevent future large commits:
   - Add ignore rules for `public/**` and `tasks/**` image extensions in `.gitignore`.
   - Remove already tracked images from the git index:
     ```bash
     python3 - <<'PY'
     import subprocess
     from pathlib import Path
     exts = {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.avif'}
     raw = subprocess.check_output(['git', 'ls-files', '-z', 'public', 'tasks'])
     paths = [p.decode() for p in raw.split(b'\0') if p]
     remove = [p for p in paths if Path(p).suffix.lower() in exts]
     if remove:
         with open('/tmp/git-remove-images.txt', 'w', encoding='utf-8') as f:
             f.write('\n'.join(remove))
         subprocess.run(['git', 'rm', '--cached', '--pathspec-from-file', '/tmp/git-remove-images.txt'], check=True)
     PY
     ```

6. Optional cleanup:
   - Delete local image files after verifying R2 URLs work.
   - If you need to purge historical blobs, use `git filter-repo` or `git lfs migrate import` and force-push.

7. Verify:
   - Run a Playwright smoke test or manual browser check to confirm images load.

## Scripts

Use the bundled scripts from the project root:
- `scripts/upload-task-images.ts`
- `scripts/upload-public-images.ts`

Keep these scripts in sync with the project if you update upload logic.
