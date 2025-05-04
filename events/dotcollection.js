const { Events, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { aimLists } = require('../db/dbObjects.js');
const { lightskyblue } = require("color-name");
const regex = /^\.collection/gm;

async function buildEmbed(maps) {
  let mapArray = ""
  let collectionName = "";
  if (maps.length > 0) {
    for (map in maps) {
      current = maps[map];
      let ind = Number(map) + 1;
      mapArray = mapArray + ("**"+ind+": [" + current.artist + " - " + current.title + " [" + current.difficulty + "]](https://osu.ppy.sh/b/" + current.map_id + ")**\n")
      if (map == 0) {
        collectionName = current.collection
      }
    }
    console.log(mapArray)
  }
  const scoreEmbed = new EmbedBuilder()
    .setAuthor({ name: "Current collection: " + collectionName })
    .setDescription(mapArray)
    .setColor(lightskyblue)
    .setFooter({ text: "shreddddddd" });
  console.log(scoreEmbed)
  return scoreEmbed;
}


module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    const msg = message.content;
    if (regex.test(msg.substring(0, 11))) {
      let collectionName = msg.substring(12)
      let maps = await aimLists.findAll({
        where: { is_current: 1 },
        order: [
          ["map_id", "DESC"],
        ]
      })
    if (collectionName.length > 0) {
      console.log(collectionName)
      const check = await aimLists.findAll({where: {collection: collectionName}})
      if(check < 1) return await message.channel.send("no collection found");
      const collection = await buildEmbed(check);
      collection.setAuthor({ name: "Listed collection: "+collectionName+" ("+check.length+" maps)" })
      return message.channel.send({ embeds: [collection] });
    } 
    const collection = await buildEmbed(maps); 
    await message.channel.send({ embeds: [collection] });
    }
  }
}
