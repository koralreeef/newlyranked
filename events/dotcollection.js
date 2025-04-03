const { Events, EmbedBuilder } = require('discord.js');
const { aimLists } = require('../db/dbObjects.js');
const { lightskyblue } = require("color-name");

async function buildEmbed() {
    const maps = await aimLists.findAll({
      order: [
        ["map_id", "DESC"],
        ]
    })
    let mapArray = ""
    for (map in maps){
      current = maps[map];
      mapArray = mapArray + ("["+current.artist+" - "+current.title+" ["+current.difficulty+"]](https://osu.ppy.sh/b/"+current.map_id+") added by "+current.adder+"\n")
    }
    const scoreEmbed = new EmbedBuilder()
    .setAuthor({ name: "Current HR reef collection:"})
    .setDescription(mapArray)
    .setColor(lightskyblue)
    .setFooter({text : "shreddddddd" });
    console.log(scoreEmbed)
    return scoreEmbed;
  }
  

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
      const msg = message.content;
      if(msg.toLowerCase() === ".collection") {
        const collection = await buildEmbed();
        return message.channel.send({ embeds: [collection] });
      }
    }
  }
