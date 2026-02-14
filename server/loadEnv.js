import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
config({ path: join(__dirname, '.env') });
config({ path: join(root, '.env') });
config({ path: join(root, '..', '.env') });
config();
