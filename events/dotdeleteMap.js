const { Events, EmbedBuilder } = require('discord.js');
const { Client } = require("osu-web.js");
const { getAccessToken } = require('../helper.js');
const { aimLists, osuUsers, aimScores } = require('../db/dbObjects.js');

const regex = /^\.deletemap \d{1,}/gm;

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    const api = new Client(await getAccessToken());
    const msg = message.content;
    if (regex.test(msg)) {
      if (message.author.id == "109299841519099904" || message.author.id == "450478289107025920") {
        let mapID = msg.substring(11);
        let beatmap;
        let self;
        try {
          beatmap = await api.beatmaps.getBeatmap(mapID);
        } catch (err) {
          return message.channel.send("couldnt find beatmap");
        }

        try {
          self = await osuUsers.findOne({ where: { user_id: message.author.id } });
        } catch (err) {
          console.log(err)
          return message.channel.send("use /osuset before registering maps in the collection");
        }
        const map = aimLists.findOne({ where: { map_id: beatmap.id } })
        if (map) {
          await aimLists.destroy({ where: { map_id: beatmap.id } });
          await aimScores.destroy({ where: { map_id: beatmap.id } });
          return message.channel.send("map deleted! (goodbye to the locals)")
        } else {
          return message.channel.send("beatmap not found in collection");
        }
      } else {
        return message.channel.send("only koral and ruyu can delete maps for now sorry");
      }
    }
  }
}
//idk how to hook it up but we'll live
