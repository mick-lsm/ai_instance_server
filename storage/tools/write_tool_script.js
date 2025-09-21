import fs from 'fs';

export async function run({name, content}){
    fs.writeFileSync(`./storage/tools/${name}.js`, content);
    return "Success";
}