const fs = require("fs")
const undici = require('undici');
const { pipeline } = require('node:stream/promises');
const { Events, AttachmentBuilder } = require('discord.js');
const { Client } = require("osu-web.js");
const { getAccessToken } = require("../helper.js");
const regex = /^\.preview \d{1,7}/gm;
//refresh every hour for new tokens gg
let api = "";

const downloadFile = async (url, beatmapID) => {
  const response = await undici.request("https:"+url);
  // TODO: You may want to check if response.statusCode is 200 (OK).
  const targetFile = fs.createWriteStream('./samples/'+beatmapID+'.mp3');
  await pipeline(response.body, targetFile);
  console.log('File downloaded!');
}

const start = async (id) => {
    api = new Client(await getAccessToken());
    const beatmap = await api.beatmaps.getBeatmap(id);
    //console.log(beatmap);
    //console.log(beatmap.beatmapset.preview_url);
    await downloadFile(beatmap.beatmapset.preview_url, id);
    return './samples/'+id+'.mp3';
}

const score = async (id) => {
    api = new Client(await getAccessToken());
    const scores = await api.users.getUserScores(id, 'recent', {
        query: {
          mode: 'osu',
          limit: 1
        }
      });
    console.log(scores[0].beatmap.url)
    console.log(scores[0].pp ?? "loved or unranked");
}

/*
const fart = async() => {
    api = await client_cred();
    await score("5645231");
}
*/ 
//fart();
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
