import { join } from 'path';
import fs from 'fs';

export async function run({path}){
    const absPath = join(process.cwd(), path);
    const content = fs.readdirSync(absPath).toLocaleString();
    return content;
}