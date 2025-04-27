const { Events, EmbedBuilder } = require('discord.js');
const { aimLists } = require('../db/dbObjects.js');
const { lightskyblue } = require("color-name");
const { collectionChannel, collectionMessage, currentD2Collection } = require('../config.json');
let ending = "";

async function buildEmbed(maps) {
  let mapArray = ""
  let collectionName = "";
  let mapIDs = "";
  if (maps.length > 0) {
    for (map in maps) {
      current = maps[map];
      let ind = Number(map) + 1;
      mapArray = mapArray + ("**" + ind + ": [" + current.artist + " - " + current.title + " [" + current.difficulty + "]](https://osu.ppy.sh/b/" + current.map_id + ")**\n")
      mapIDs = mapIDs + current.map_id + "\n";
      if (map == 0) {
        collectionName = current.collection
      }
    }
  }
  console.log(mapIDs)
  ending = "season 0 ends <t:1747094580:R>"
  const scoreEmbed = new EmbedBuilder()
    .setAuthor({ name: "Current collection: " + collectionName })
    .setDescription(mapArray + "\nraw map IDs below; **click the top right of the window to copy the list**``` " + mapIDs + "```")
    .setColor(lightskyblue)
    .setFooter({ text: "season theme: sped up songs" });
  console.log(scoreEmbed)
  return scoreEmbed;
}

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    let msg = message.content;
    /*
    console.log(message.type);
    if(message.type == 19){
    const repliedMessage = await message.fetchReference();
    console.log(repliedMessage.content);
    console.log("found this: "+repliedMessage);
    }
    console.log(message.content);
    */
    if (msg === ".refresh") {
      if (message.author.id == "109299841519099904") {
        const channel = message.client.channels.cache.get(collectionChannel);
        const embed = await channel.messages.fetch(collectionMessage);
        const maps = await aimLists.findAll({
          where: { is_current: 1 },
          order: [
            ["map_id", "DESC"],
          ]
        })
        const collection = await buildEmbed(maps);
        await embed.edit({ content: ending, embeds: [collection] });
      }
    }
  }
}

//https://discordjs.guide/popular-topics/canvas.html#getting-started