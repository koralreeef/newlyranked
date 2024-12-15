const { Client } = require('osu-web.js');
const fs = require("fs")
const {clientSecret, clientIDv2} = require('../config.json');
const undici = require('undici');
const { pipeline } = require('node:stream/promises');
const { Events, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { access } = require('node:fs');
const regex = /^\.preview \d{1,7}/gm;
//refresh every hour for new tokens gg
let accessToken;
let api;
const client_cred = async() => {
const url = new URL(
    "https://osu.ppy.sh/oauth/token"
);

const headers = {
    "Accept": "application/json",
    "Content-Type": "application/x-www-form-urlencoded",
};

let body = "client_id="+clientIDv2+"&client_secret="+clientSecret+"&grant_type=client_credentials&scope=public";
const response = await fetch(url, {
    method: "POST",
    headers,
    body: body,
}).then(response => response.json());
console.log(response.access_token);
return response.access_token;
}

const initializeTokens = async() => {
    accessToken = await client_cred();
}

const downloadFile = async (url, beatmapID) => {
  const response = await undici.request("https:"+url);
  // TODO: You may want to check if response.statusCode is 200 (OK).
  const targetFile = fs.createWriteStream('./samples/'+beatmapID+'.mp3');
  await pipeline(response.body, targetFile);
  console.log('File downloaded!');
}

const start = async (id) => {
    const beatmap = await api.beatmaps.getBeatmap(id);
    //console.log(beatmap);
    //console.log(beatmap.beatmapset.preview_url);
    await downloadFile(beatmap.beatmapset.preview_url, beatmap.beatmapset.id);
    return './samples/'+beatmap.beatmapset.id+'.mp3';
}

setInterval(async () => {
api = new Client(await initializeTokens());
}, 3600001);

const poo = async () => {
    await initializeTokens();
    api = new Client(accessToken);
}

poo();
module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        let msg = message.content;
        if(regex.test(msg)){
            let beatmapID = msg.substring(9);      
            let filePath = await start(beatmapID);
            const attachment = new AttachmentBuilder(filePath);   
            return await message.channel.send({
                  files: [attachment],
                });
            }
        }
    }

//idk how to hook it up but we'll live
