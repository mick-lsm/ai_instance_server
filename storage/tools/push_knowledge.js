import ai from "../../ai.js";
import database from "../../database.js";
import { embed } from "../../knowledge_base.js";

export async function run({text}){
    await embed(text);
    return "Successfully Embed Knowledge";
}