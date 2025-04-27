const { Events, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { aimLists } = require('../db/dbObjects.js');
const { collectionChannel, collectionMessage, currentD1Collection, currentD2Collection } = require('../config.json');
const { lightskyblue } = require("color-name");
let ending = "";

async function buildEmbed(toggle) {
  let maps;
  if (!toggle) {
    maps = await aimLists.findAll({
      where: { collection: currentD1Collection },
      order: [
        ["map_id", "DESC"],
      ]
    })
  } else {
    maps = await aimLists.findAll({
      where: { collection: currentD2Collection },
      order: [
        ["map_id", "DESC"],
      ]
    })
  }
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
  name: Events.ClientReady,
  async execute(client) {
    const epoch = Date.now();
    const collectionToggle = new ButtonBuilder()
      .setCustomId("collectionToggle" + epoch)
      .setLabel("to div 2 collection")
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(collectionToggle);
    let toggle = false;
    const channel = client.channels.cache.get(collectionChannel);
    const embed = await channel.messages.fetch(collectionMessage);
    const collection = await buildEmbed(toggle);
    await embed.edit({ content: ending, embeds: [collection], components: [row] });
    const collector = embed.createMessageComponentCollector();
    collector.on("collect", async (m) => {
      if (m.customId == "collectionToggle" + epoch) {
        if (!toggle) {
          toggle = true;
          collectionToggle.setLabel("to div 1 collection")
        } else {
          toggle = false;
          collectionToggle.setLabel("to div 2 collection")
        }
        await m.update({
          embeds: [await buildEmbed(toggle)],
          components: [row],
        })
      }
    }
    )
  }
}

//https://discordjs.guide/popular-topics/canvas.html#getting-started