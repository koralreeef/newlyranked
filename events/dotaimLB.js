const { Events, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { Client } = require("osu-web.js");
const { getAccessToken } = require('../helper.js');
const { aimLists, aimScores } = require('../db/dbObjects.js');
const { lightskyblue } = require("color-name");
const regex = /^\.aimlbs/gm;

async function buildEmbed(map) {
  const mapInfo = map.artist + " - " + map.title + " [" + map.difficulty + "]"
  const scores = await aimScores.findAll({
    where: { map_id: map.map_id },
    order: [
      ["misscount", "ASC"],
    ]
  })
  let scoreArray = ""
  let first = scores[0].user_id;
  for (score in scores) {
    let hidden = ""
    let bro = scores[score]
    let index = Number(score) + 1
    let date = Date.parse(bro.date);
    let timestamp = Math.floor(date / 1000);
    if (bro.hidden) {
      hidden = " (HD)"
    }
    scoreArray = scoreArray + ("**#" + index + "** **" + bro.username + "** • **" + bro.combo + "x**/" + bro.max_combo + " • **" + bro.misscount + "** <:miss:1324410432450068555>** <t:" + timestamp + ":R>\n"
      + bro.accuracy + "%  • **" + bro.score.toLocaleString() + "** " + bro.mods + hidden + "**\n")
  }
  if (scoreArray === "") {
    scoreArray = "**no scores yet :(**"
  }
  const scoreEmbed = new EmbedBuilder()
    .setAuthor({
      name: "Current #1: " + scores[0].username,
      iconURL: "https://a.ppy.sh/" + first
    })
    .setTitle(mapInfo)
    .setURL("https://osu.ppy.sh/b/" + map.map_id)
    .setThumbnail("https://b.ppy.sh/thumb/" + map.set_id + "l.jpg")
    .setDescription(`\n${scoreArray}`)
    .setColor(lightskyblue)
    .setFooter({
      text: "collection: " + map.collection + "\nmapset by " + map.creator,
      iconURL: "https://a.ppy.sh/" + map.creatorID
    });
  //console.log(scoreEmbed)
  return scoreEmbed;
}


module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    const api = new Client(await getAccessToken());
    const msg = message.content;
    if (regex.test(msg.substring(0, 8))) {
      let aimList = await aimLists.findAll({
        order: [
          ["map_id", "DESC"],
        ]
      });
      let collectionName = msg.substring(8);
      if (collectionName.length > 0) {
        aimList = await aimLists.findAll({
          where: { collection: collectionName },
          order: [
            ["map_id", "DESC"],
          ]
        })
        if(aimList.length < 1){
          return message.channel.send("couldnt find collection")
        }
      }
      console.log("asdasd "+collectionName)
      const epoch = Date.now();
      const forward = new ButtonBuilder()
        .setCustomId("forward" + epoch)
        .setLabel("⟶")
        .setStyle(ButtonStyle.Primary);

      const backward = new ButtonBuilder()
        .setCustomId("back" + epoch)
        .setDisabled(true)
        .setLabel("⟵")
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder().addComponents(backward, forward);
      const row2 = new ActionRowBuilder().addComponents(backward, forward);

      const leaderboard = await buildEmbed(aimList[0]);
      if(aimList.length == 1){
        return await message.channel.send({ embeds: [leaderboard]})
      }
      const msgRef = await message.channel.send({ embeds: [leaderboard], components: [row] });

      const collector = message.channel.createMessageComponentCollector({
        time: 120_000,
      });
      let ind = 0
      let maxIndex = aimList.length - 1
      collector.on("collect", async (m) => {
        //gray out buttons on page end

        if (m.customId === "back" + epoch) {
          ind--;
          if (ind == 0) backward.setDisabled(true);
          forward.setDisabled(false);
          console.log("backwards");
          await m.update({
            embeds: [await buildEmbed(aimList[ind])],
            components: [row],
          })
        }
        if (m.customId === "forward" + epoch) {
          ind++
          if (ind == maxIndex) forward.setDisabled(true);
          backward.setDisabled(false);
          console.log("forwards");
          await m.update({
            embeds: [await buildEmbed(aimList[ind])],
            components: [row2],
          })
        }
      });
      collector.on("end", async () => {
        await msgRef.edit({
          embeds: [await buildEmbed(aimList[ind])],
          components: [],
        });
      });
    }
  }
}

