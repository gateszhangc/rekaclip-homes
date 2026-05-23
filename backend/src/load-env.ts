import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

config({ path: path.join(projectRoot, ".env") });
config({ path: path.join(projectRoot, ".env.local"), override: true });
