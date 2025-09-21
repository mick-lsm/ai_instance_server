import database from "../../database.js";
import { existsSync } from 'fs';

export async function run({ name, description, parameters }) {
    if (!existsSync(`./storage/tools/${name}.js`)) {
        return `ERROR! Related Javascript ./storage/tools/${name}.js not exists!`
    }
    if((await database.Tools.findOne({where: { name: name}})) != null) {
        return `ERROR! Tool already existed!`
    }
    return (await database.Tools.create({
        name, description, parameters
    })).id;
}