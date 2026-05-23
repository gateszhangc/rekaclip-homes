/**
 * Upload Task Images to Cloudflare R2
 * 
 * This script uploads all images from tasks/ directory to Cloudflare R2
 * and updates the task.md file with new URLs.
 * 
 * Usage:
 *   npx tsx scripts/upload-task-images.ts
 *   npx tsx scripts/upload-task-images.ts --dry-run  # Preview changes without uploading
 */

import * as fs from 'fs';
import * as path from 'path';
import { AwsClient } from 'aws4fetch';

// Configuration from environment or hardcoded for script
const config = {
    endpoint: process.env.STORAGE_ENDPOINT || 'https://45a8243cc61a1d87d62200124ab0c311.r2.cloudflarestorage.com',
    accessKey: process.env.STORAGE_ACCESS_KEY || '42c3f0cf309b3322b6ca0d970ea47f5e',
    secretKey: process.env.STORAGE_SECRET_KEY || '9e994bbf8ef05ab3ac1fddd4892ef6a970ac7912796d709c153c524aeb7baf8f',
    bucket: process.env.STORAGE_BUCKET || 'animal-generator',
    domain: process.env.STORAGE_DOMAIN || 'https://pub-e1eb76428e24457ebfc067c635cb4fc4.r2.dev',
    region: 'auto',
};

const tasksDir = path.join(process.cwd(), 'tasks');
const taskMdPath = path.join(tasksDir, 'task.md');
const dryRun = process.argv.includes('--dry-run');

// Image extensions to upload
const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];

interface UploadResult {
    localPath: string;
    r2Url: string;
    size: number;
}

async function uploadFile(filePath: string, key: string): Promise<string> {
    const body = fs.readFileSync(filePath);
    const url = `${config.endpoint}/${config.bucket}/${key}`;

    const client = new AwsClient({
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
        region: config.region,
        service: 's3',
    });

    const ext = path.extname(filePath).toLowerCase();
    const contentTypeMap: Record<string, string> = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
    };

    const headers: Record<string, string> = {
        'Content-Type': contentTypeMap[ext] || 'application/octet-stream',
        'Content-Disposition': 'inline',
        'Content-Length': body.length.toString(),
    };

    const request = new Request(url, {
        method: 'PUT',
        headers,
        body,
    });

    const response = await client.fetch(request);

    if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return `${config.domain}/${key}`;
}

async function main() {
    console.log('Upload task images to Cloudflare R2\n');

    if (dryRun) {
        console.log('DRY RUN MODE - No files will be uploaded\n');
    }

    // Find all image files in tasks directory
    const files = fs.readdirSync(tasksDir);
    const imageFiles = files.filter(f =>
        imageExtensions.includes(path.extname(f).toLowerCase())
    );

    console.log(`Found ${imageFiles.length} images in tasks/\n`);

    if (imageFiles.length === 0) {
        console.log('No images to upload.');
        return;
    }

    // Read task.md content
    let taskMdContent = fs.readFileSync(taskMdPath, 'utf-8');
    const uploadResults: UploadResult[] = [];
    const errors: { file: string; error: string }[] = [];

    // Upload each image
    for (const file of imageFiles) {
        const localPath = path.join(tasksDir, file);
        const stats = fs.statSync(localPath);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        const key = `tasks/${file}`;

        console.log(`Uploading ${file} (${sizeMB} MB)`);

        if (dryRun) {
            const mockUrl = `${config.domain}/${key}`;
            uploadResults.push({ localPath, r2Url: mockUrl, size: stats.size });
            console.log(`   -> Would upload to: ${mockUrl}`);
        } else {
            try {
                const r2Url = await uploadFile(localPath, key);
                uploadResults.push({ localPath, r2Url, size: stats.size });
                console.log(`   OK: ${r2Url}`);
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                errors.push({ file, error: errorMsg });
                console.log(`   Failed: ${errorMsg}`);
            }
        }
    }

    // Update task.md with new URLs
    console.log('\nUpdating task.md references...\n');

    let updatedCount = 0;
    for (const result of uploadResults) {
        const fileName = path.basename(result.localPath);

        // Replace markdown image references: ![alt text](filename.png)
        const markdownPattern = new RegExp(
            `!\\[([^\\]]*)\\]\\(${fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`,
            'g'
        );

        const newContent = taskMdContent.replace(markdownPattern, (match, alt) => {
            updatedCount++;
            return `![${alt}](${result.r2Url})`;
        });

        if (newContent !== taskMdContent) {
            taskMdContent = newContent;
            console.log(`   Updated references to: ${fileName}`);
        }
    }

    if (!dryRun && updatedCount > 0) {
        fs.writeFileSync(taskMdPath, taskMdContent, 'utf-8');
        console.log(`\nUpdated ${updatedCount} references in task.md`);
    } else if (dryRun && updatedCount > 0) {
        console.log(`\nWould update ${updatedCount} references in task.md`);
    }

    // Summary
    console.log('\nSummary:');
    console.log(`   Uploaded: ${uploadResults.length - errors.length}`);
    console.log(`   Failed: ${errors.length}`);

    const totalSize = uploadResults.reduce((sum, r) => sum + r.size, 0);
    console.log(`   Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

    if (!dryRun && uploadResults.length > 0) {
        console.log('\nNext steps:');
        console.log('   1. Add tasks/*.png to .gitignore');
        console.log('   2. Remove images from git tracking: git rm --cached tasks/*.png');
        console.log('   3. Commit and push');
    }
}

main().catch(console.error);
