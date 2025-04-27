const { Events, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { Client } = require("osu-web.js");
const { getAccessToken } = require('../helper.js');
const { aimLists, aimScores, osuUsers } = require('../db/dbObjects.js');
const { currentD2Collection } = require('../config.json');
const { lightskyblue } = require("color-name");
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const regex = /^\.aimlbs/gm;

async function buildEmbed(map, ind, maxIndex, user) {
  const mapInfo = map.artist + " - " + map.title + " [" + map.difficulty + "]"
  let name = "no misscount leader yet!"
  let iconLink = ""
  let pageNum = Number(ind) + 1;
  let limit = maxIndex + 1;
  const scores = await aimScores.findAll({
    limit: 15,
    where: { map_id: map.map_id },
    order: [
      ["misscount", "ASC"],
      ["date", "ASC"]
    ]
  })
  let scoreArray = ""
  if (scores.length < 1) {
    scoreArray = "**no scores yet :(**"
  } else {
    name = "Current #1: " + scores[0].username + "\ncollection: " + map.collection;
    iconLink = scores[0].user_id
    for (score in scores) {
      let hidden = ""
      let bro = scores[score]
      let index = Number(score) + 1
      let date = Date.parse(bro.date);
      let timestamp = Math.floor(date / 1000);
      if (bro.hidden) {
        hidden = " (HD)"
      }
      if (bro.user_id == user) {
        scoreArray = scoreArray + ("**#" + index + "** **__[" + bro.username + "](https://osu.ppy.sh/users/" + scores[score].user_id + ")__** • **" + bro.misscount + "** <:miss:1324410432450068555> ** " + bro.mods + hidden + "**  <t:" + timestamp + ":R>\n **"
          + bro.accuracy + "%  • ** **" + bro.combo + "x**/" + bro.max_combo + " • " + bro.score.toLocaleString() + "\n")
      } else {
        scoreArray = scoreArray + ("**#" + index + "** **[" + bro.username + "](https://osu.ppy.sh/users/" + scores[score].user_id + ")** • **" + bro.misscount + "** <:miss:1324410432450068555> ** " + bro.mods + hidden + "**  <t:" + timestamp + ":R>\n  **"
          + bro.accuracy + "%  • ** **" + bro.combo + "x**/" + bro.max_combo + " • " + bro.score.toLocaleString() + "\n")
      }
    }
  }

  scoreEmbed = new EmbedBuilder()
    .setAuthor({
      name: name,
      iconURL: "https://a.ppy.sh/" + iconLink
    })
    .setTitle(mapInfo)
    .setURL("https://osu.ppy.sh/b/" + map.map_id)
    .setThumbnail("https://b.ppy.sh/thumb/" + map.set_id + "l.jpg")
    .setDescription(`\n${scoreArray}`)
    .setColor(lightskyblue)
    .setFooter({
      text: "map: " + pageNum + "/" + limit + "\nmapset by " + map.creator,
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
      let mapIndex = -1;
      let collectionName = "";
      let collectionStr = 0;
      const self = await osuUsers.findOne({ where: { user_id: message.author.id } });
      const user = self.osu_id
      const epoch = Date.now();

      const forward = new ButtonBuilder()
        .setCustomId("forward" + epoch)
        .setLabel("⟶")
        .setStyle(ButtonStyle.Primary);

      const modal = new ButtonBuilder()
        .setCustomId("modal" + epoch)
        .setLabel("🔢")
        .setStyle(ButtonStyle.Primary);

      const backward = new ButtonBuilder()
        .setCustomId("back" + epoch)
        .setDisabled(true)
        .setLabel("⟵")
        .setStyle(ButtonStyle.Primary);

      const modal1 = new ModalBuilder({
        customId: "modal" + epoch,
        title: "jump to a page",
      });

      const favoriteColorInput = new TextInputBuilder({
        customId: "page num" + epoch,
        label: "page number",
        style: TextInputStyle.Short,
      })

      const modalRow = new ActionRowBuilder().addComponents(favoriteColorInput);
      modal1.addComponents(modalRow)
      const row = new ActionRowBuilder().addComponents(backward, modal, forward);
      const row2 = new ActionRowBuilder().addComponents(backward, modal, forward);
      const row3 = new ActionRowBuilder().addComponents(backward, modal, forward);

      if (msg.indexOf("c=") == -1) {
        collectionStr = msg.length;
      } else {
        collectionName = msg.substring(msg.indexOf("c=") + 2)
        collectionStr = msg.indexOf("c=") - 1;
      }

      if (msg.indexOf("p=") > 0) {
        mapIndex = Number(msg.substring(msg.indexOf("p=") + 2, collectionStr)) - 1;
      }
      let aimList = await aimLists.findAll({
        where: { is_current: 1 },
        order: [
          ["map_id", "DESC"],
        ]
      });
      //VERY BAD LMAO
      console.log(msg.substring(8, 9))
      if(msg.substring(7, 8) == "2") {
        aimList = await aimLists.findAll({
          where: { collection: currentD2Collection },
          order: [
            ["map_id", "DESC"],
          ]
        });
      }
      if (collectionName.length > 0) {
        aimList = await aimLists.findAll({
          where: { 
            collection: { 
              [Op.like]: collectionName.toLowerCase()
            } 
          },
          order: [
            ["map_id", "DESC"],
          ]
        })
        if (aimList.length < 1) {
          return message.channel.send("couldnt find collection")
        }
      }
      console.log("asdasd " + collectionName)

      let ind = 0
      let maxIndex = aimList.length - 1

      if (mapIndex > -1) {
        if (mapIndex >= aimList.length) return await message.channel.send("index is out of bounds for this collection; try a lower number")
        ind = mapIndex;
        if (ind > 0) backward.setDisabled(false)
        if (ind == maxIndex) forward.setDisabled(false)
      }

      const leaderboard = await buildEmbed(aimList[ind], ind, maxIndex, user);
      if (aimList.length == 1) {
        return await message.channel.send({ embeds: [leaderboard] })
      }

      const msgRef = await message.channel.send({ embeds: [leaderboard], components: [row] });

      const collector = message.channel.createMessageComponentCollector({
        time: 300_000,
      });

      collector.on("collect", async (m) => {
        //gray out buttons on page end

        if (m.customId === "back" + epoch) {
          ind--;
          if (ind == 0) backward.setDisabled(true);
          forward.setDisabled(false);
          console.log("backwards");
          await m.update({
            embeds: [await buildEmbed(aimList[ind], ind, maxIndex, user)],
            components: [row],
          })
        }
        if (m.customId === "forward" + epoch) {
          ind++
          if (ind == maxIndex) forward.setDisabled(true);
          backward.setDisabled(false);
          console.log("forwards");
          await m.update({
            embeds: [await buildEmbed(aimList[ind], ind, maxIndex, user)],
            components: [row2],
          })
        }
        //button to switch between pp and misscount lbs
        if (m.customId === "modal" + epoch) {
          let backup = ind;
          await m.showModal(modal1)
          const filter = (m) => m.customId === "modal" + epoch;
          m.awaitModalSubmit({ filter, time: 60_000 })
            .then(async (m) => {
              ind = Number(m.fields.getTextInputValue("page num" + epoch)) - 1
              if (ind > -1 && ind <= maxIndex) {
                backward.setDisabled(false);
                forward.setDisabled(false);
                if(ind == 0) {
                  backward.setDisabled(true);
                }
                if(ind == maxIndex) {
                  forward.setDisabled(true);
                }
                await m.update({
                  embeds: [await buildEmbed(aimList[ind], ind, maxIndex, user)],
                  components: [row3],
                })
              } else {
                ind = backup;
                await m.update({
                  embeds: [await buildEmbed(aimList[ind], ind, maxIndex, user)],
                  components: [row3],
                })
              }
            })
            .catch(async (err) => {
              console.log(err);
            })
        }
      });
      collector.on("end", async () => {
        await msgRef.edit({
          embeds: [await buildEmbed(aimList[ind], ind, maxIndex, user)],
          components: [],
        });
      });
    }
  }
}

