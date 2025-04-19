const { Events, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { aimLists } = require('../db/dbObjects.js');
const { lightskyblue } = require("color-name");
const regex = /^\.list/gm;

async function buildEmbed(maps) {
  let mapArray = ""
  if (maps.length > 0) {
    for (map in maps) {
      current = maps[map];
      mapArray = mapArray + current+"\n";
    }
  }
  const scoreEmbed = new EmbedBuilder()
    .setAuthor({ name: "Avaliable collections: " })
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
    if (regex.test(msg)) {
    const list = await aimLists.findAll()
    let collectionArray = []
    for(collectionName in list){
      if(!collectionArray.includes(list[collectionName].collection)){
        collectionArray.push(list[collectionName].collection);
      }
    }
    const collection = await buildEmbed(collectionArray); 
    await message.channel.send({ embeds: [collection] });
    }
  }
}
