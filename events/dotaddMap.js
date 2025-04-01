const { Events, EmbedBuilder } = require('discord.js');
const { Client } = require("osu-web.js");
const { getAccessToken } = require('../helper.js');
const { aimLists, osuUsers } = require('../db/dbObjects.js');

const regex = /^\.addmap \d{1,}/gm;

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
      const api = new Client(await getAccessToken());
      const msg = message.content;
      if(regex.test(msg)) {
        if(message.author.id == "109299841519099904" || message.author.id == "450478289107025920") {
        let mapID = msg.substring(8);
        let beatmap;
        let self;
        try{
            beatmap = await api.beatmaps.getBeatmap(mapID);
        } catch (err) {
            return message.channel.send("couldnt find beatmap");
        }

        try{
            self = await osuUsers.findOne({ where: {user_id: message.author.id }});
        } catch (err) {
            console.log(err)
            return message.channel.send("use /osuset before registering maps in the collection");
        }
        const map = await aimLists.findOne({ where: {map_id: beatmap.id }})
        if(map){
            return message.channel.send("this map has already been added by "+map.adder+"!");
        } else {
        await aimLists.create({
            map_id: mapID,
            adder: self.username,
            difficulty: beatmap.version,
            title: beatmap.beatmapset.title,
            artist: beatmap.beatmapset.artist,
            creator: beatmap.beatmapset.creator,
            creatorID: beatmap.beatmapset.user_id,
        })
        return message.channel.send("beatmap added to hr reef collection!\n"+beatmap.beatmapset.artist+" - "+beatmap.beatmapset.title+" [["+beatmap.version+"]]"+
            "(https://osu.ppy.sh/beatmapsets/"+beatmap.beatmapset_id+"#osu/"+beatmap.id+")");
        }
        } else{
            return message.channel.send("only koral and ruyu can add maps for now sorry");
        }
      }
    }
  }
//idk how to hook it up but we'll live
