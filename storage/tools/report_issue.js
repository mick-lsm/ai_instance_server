import { randomUUID } from 'crypto';
import fs from 'fs';

export async function run({ title, content }){
    fs.writeFileSync(`./storage/reports/${title}_${randomUUID()}.md`, content);
    return "successfully reported an issue"
}