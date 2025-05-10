const { Events, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { Client } = require("osu-web.js");
const { getAccessToken } = require('../helper.js');
const { aimLists, aimScores, osuUsers } = require('../db/dbObjects.js');
const { currentD2Collection } = require('../config.json');
const { lightskyblue } = require("color-name");
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const regex = /^\.aimlbs/gm;

async function buildFull(map, ind, user, m) {
  const mapInfo = map.artist + " - " + map.title + " [" + map.difficulty + "]"
  let mod = m;
  let scores = await aimScores.findAll({
    //pass in collection name
    where: { map_id: map.map_id, collection: map.collection },
    order: [
      ["misscount", "ASC"],
      ["date", "ASC"]
    ]
  })
  if(mod != ""){
    scores = await aimScores.findAll({
      where: { map_id: map.map_id, mods: mod, collection: map.collection },
      order: [
        ["misscount", "ASC"],
        ["date", "ASC"]
      ]
    })
  }
  const author = await osuUsers.findOne({ where: {osu_id: user}})
  let scoreArray = [];
  let userScore = "";
  const userScores = [];
  let scoreString = "";
  for (let i = 0; i < scores.length; i++) {
    let scoreString = "";
    const current = scores[i];
    //console.log(current.user_id+", "+user)
    if (scores.length < 1) {
      scoreString = "**no scores yet :(**"
      scoreArray.push(scoreString);
    } else if (current.user_id == user) {
      console.log("hi")
      const score = Number(current.score);
      let hidden = "";
      let index = Number(i) + 1
      if(current.hidden) hidden = " (HD)" 
      let date = Date.parse(current.date);
      let season = "";
      if(current.past_season) season = "**("+current.past_season+")**"
      let timestamp = Math.floor(date / 1000) //remove last subtraction after dst
      userScore = ("**#" + index + "** **__[" + current.username + "](https://osu.ppy.sh/users/" + current.user_id + ")__** • **" + current.misscount + "** <:miss:1324410432450068555> ** " + current.mods + hidden + "**  <t:" + timestamp + ":R> "+season+"\n **"
        + current.accuracy + "%  • ** **" + current.combo + "x**/" + current.max_combo + " • " + score.toLocaleString() + "\n")
      userScores.push(userScore)
    }
  }

  name = "Current #1: " + scores[0].username + "\ncollection: " + map.collection;
  iconLink = scores[0].user_id
  let selfScore = "";
  if (scoreString != "**no scores yet :(**") {
    let first = "";
    for (scor in scores) {
      if (scor == 0) first = scores[scor].user_id;

      const current = scores[scor]
      const score = Number(scores[scor].score);
      let hidden = "";
      if(current.hidden) hidden = " (HD)" 
      let index = Number(scor) + 1
      let date = Date.parse(scores[scor].date);
      let timestamp = Math.floor(date / 1000) //remove last subtraction after dst
      let season = "";
      if(current.past_season) season = "**("+current.past_season+")**"
      if (current.user_id == user) {
        scoreString = scoreString + ("**#" + index + "** **__[" + current.username + "](https://osu.ppy.sh/users/" + current.user_id + ")__** • **" + current.misscount + "** <:miss:1324410432450068555> ** " + current.mods + hidden + "**  <t:" + timestamp + ":R> "+season+"\n **"
          + current.accuracy + "%  • ** **" + current.combo + "x**/" + current.max_combo + " • " + score.toLocaleString() + "\n")
        selfScore = selfScore + ("**#" + index + "** **__[" + current.username + "](https://osu.ppy.sh/users/" + current.user_id + ")__** • **" + current.misscount + "** <:miss:1324410432450068555> ** " + current.mods + hidden + "**  <t:" + timestamp + ":R> "+season+"\n **"
          + current.accuracy + "%  • ** **" + current.combo + "x**/" + current.max_combo + " • " + score.toLocaleString() + "\n")
      } else {
        scoreString = scoreString + ("**#" + index + "** **[" + current.username + "](https://osu.ppy.sh/users/" + current.user_id + ")** • **" + current.misscount + "** <:miss:1324410432450068555> ** " + current.mods + hidden + "**  <t:" + timestamp + ":R> "+season+"\n **"
          + current.accuracy + "%  • ** **" + current.combo + "x**/" + current.max_combo + " • " + score.toLocaleString() + "\n")
      }
      //i barely know how this is working jesus christ
      if (index % 15 == 0) {
        const check = [];
        for(userscore in userScores){
          if(!scoreString.includes(userScores[userscore])){
            check.push(userScores[userscore])
          }
        }
        if (check.length > 0){
          scoreString = scoreString + "\n__**" + author.username + "'s score (s):**__ \n";
          for(userscore in check){
            scoreString = scoreString + check[userscore]
          }
        }
        scoreArray.push(scoreString);
        scoreString = "";
      }
    }
    const check = [];
    for(userscore in userScores){
      if(!scoreString.includes(userScores[userscore])){
        check.push(userScores[userscore])
      }
    }
    if (check.length > 0){
      scoreString = scoreString + "\n__**" + author.username + "'s score (s):**__ \n";
      for(userscore in check){
        scoreString = scoreString + check[userscore]
      }
    }
    scoreArray.push(scoreString);
  }
  console.log(userScores)
  console.log(userScores.length)
  scoreEmbed = new EmbedBuilder()
    .setAuthor({
      name: name,
      iconURL: "https://a.ppy.sh/" + iconLink
    })
    .setTitle(mapInfo)
    .setURL("https://osu.ppy.sh/b/" + map.map_id)
    .setThumbnail("https://b.ppy.sh/thumb/" + map.set_id + "l.jpg")
    .setDescription(`\n${scoreArray[ind]}`)
    .setColor(lightskyblue)
    .setFooter({
      text: "\nmapset by " + map.creator,
      iconURL: "https://a.ppy.sh/" + map.creatorID
    });
  //console.log(scoreEmbed)
  return scoreEmbed;
}

async function buildEmbed(map, ind, maxIndex, user) {
  let dt = ""
  if(map.required_dt) dt = "+DT"
  console.log(map)
  const mapInfo = map.artist + " - " + map.title + " [" + map.difficulty + "] "+dt
  let name = "no misscount leader yet!"
  let iconLink = ""
  let pageNum = Number(ind) + 1;
  let limit = maxIndex + 1;
  const scores = await aimScores.findAll({
    limit: 15,
    where: { map_id: map.map_id, collection: map.collection },
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
      let season = "";
      if(bro.past_season) season = "**("+bro.past_season+")**"
      if (bro.hidden) {
        hidden = " (HD)"
      }
      if (bro.user_id == user) {
        scoreArray = scoreArray + ("**#" + index + "** **__[" + bro.username + "](https://osu.ppy.sh/users/" + scores[score].user_id + ")__** • **" + bro.misscount + "** <:miss:1324410432450068555> ** " + bro.mods + hidden + "**  <t:" + timestamp + ":R> "+season+"\n **"
          + bro.accuracy + "%  • ** **" + bro.combo + "x**/" + bro.max_combo + " • " + bro.score.toLocaleString() + "\n")
      } else {
        scoreArray = scoreArray + ("**#" + index + "** **[" + bro.username + "](https://osu.ppy.sh/users/" + scores[score].user_id + ")** • **" + bro.misscount + "** <:miss:1324410432450068555> ** " + bro.mods + hidden + "**  <t:" + timestamp + ":R> "+season+"\n  **"
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

      //if magnify, show different build embed and then show lbs in 15
      //maybe have a command for this aswell
      const magnify = new ButtonBuilder()
        .setCustomId("magnify" + epoch)
        //.setDisabled(true)
        .setLabel("🔎")
        .setStyle(ButtonStyle.Primary);

      const zoom = new ButtonBuilder()
      .setCustomId("zoomOut" + epoch)
      //.setDisabled(true)
      .setLabel("⤵️")
      .setStyle(ButtonStyle.Primary);

      const hr = new ButtonBuilder()
        .setCustomId("hr" + epoch)
        .setLabel("hr only")
        .setStyle(ButtonStyle.Danger);

      const reset = new ButtonBuilder()
          .setCustomId("reset" + epoch)
          .setLabel("reset")
          .setStyle(ButtonStyle.Success);

      const nm = new ButtonBuilder()
          .setCustomId("nm" + epoch)
          .setLabel("nm only")
          .setStyle(ButtonStyle.Secondary);

      const magnifyBackward = new ButtonBuilder()
      .setCustomId("magnifyBack" + epoch)
      .setDisabled(true)
      .setLabel("⟵")
      .setStyle(ButtonStyle.Primary);

      const magnifyForward = new ButtonBuilder()
      .setCustomId("magnifyForward" + epoch)
      .setLabel("⟶")
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
      const row = new ActionRowBuilder().addComponents(backward, magnify, modal, forward);
      const row2 = new ActionRowBuilder().addComponents(backward, magnify, modal, forward);
      const row3 = new ActionRowBuilder().addComponents(backward, magnify, modal, forward);
      const row4 = new ActionRowBuilder().addComponents(magnifyBackward, zoom, magnifyForward);
      const row5 = new ActionRowBuilder().addComponents(nm, hr, reset);
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
      if (msg.substring(7, 8) == "2") {
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
      let innerInd = 0;
      let mod = "";
      collector.on("collect", async (m) => {
        //gray out buttons on page end
        let magnifyUnfiltered = await aimScores.findAll({
          where: { map_id: aimList[ind].map_id },
        })
        if(mod != ""){
          magnifyUnfiltered = await aimScores.findAll({
            where: { map_id: aimList[ind].map_id, mods: mod },
          })
        }
        //extra query :(((((((())))))))
        const unique = []
        if(magnifyUnfiltered.length > 0){
          magnify.setDisabled(false)
          for(score in magnifyUnfiltered){
            if(!unique.includes(magnifyUnfiltered[score].user_id)){
              unique.push(magnifyUnfiltered[score].user_id)
            }
          }
        } else {
          magnify.setDisabled(true) 
        }
        let magnifyMapCount = unique.length
        let maxMagnifyIndex = Math.trunc((unique.length / 15))
        if(magnifyMapCount % 15 == 0) maxMagnifyIndex--
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
        if (m.customId === "magnify" + epoch) {
          if(magnifyMapCount < 15){
            magnifyForward.setDisabled(true);
            magnifyBackward.setDisabled(true);
          }
          console.log("magnify");
          await m.update({
            embeds: [await buildFull(aimList[ind], innerInd, user, mod)],
            components: [row4, row5],
          })
        }
        if (m.customId === "zoomOut" + epoch) {
          innerInd = 0;
          magnifyBackward.setDisabled(true);
          mod = "";
          await m.update({
            embeds: [await buildEmbed(aimList[ind], ind, maxIndex, user)],
            components: [row],
          })
        }
        if (m.customId === "magnifyForward" + epoch) {
          innerInd++;
          console.log(maxMagnifyIndex)
          if (innerInd == maxMagnifyIndex) magnifyForward.setDisabled(true);
          magnifyBackward.setDisabled(false);
          console.log("magnify");
          await m.update({
            embeds: [await buildFull(aimList[ind], innerInd, user, mod)],
            components: [row4, row5],
          })
        }
        if (m.customId === "magnifyBack" + epoch) {
          innerInd--;
          if (innerInd == 0) magnifyBackward.setDisabled(true);
          magnifyForward.setDisabled(false);
          console.log("magnify");
          await m.update({
            embeds: [await buildFull(aimList[ind], innerInd, user, mod)],
            components: [row4, row5],
          })
        }
        if (m.customId === "nm" + epoch) {
          innerInd = 0;
          mod = "+NM"
          magnifyMapCount = await aimScores.count({
            where: { map_id: aimList[ind].map_id, mods: mod },
          })
          if(magnifyMapCount <= 15){
            magnifyForward.setDisabled(true);
            magnifyBackward.setDisabled(true);
          } else {
            magnifyForward.setDisabled(false);
            magnifyBackward.setDisabled(true);
          }
          console.log("magnify");
          await m.update({
            embeds: [await buildFull(aimList[ind], innerInd, user, mod)],
            components: [row4, row5],
          })
        }
        if (m.customId === "hr" + epoch) {
          innerInd = 0;
          mod = "+HR"
          magnifyMapCount = await aimScores.count({
            where: { map_id: aimList[ind].map_id, mods: "+HR" },
          })
          if(magnifyMapCount <= 15){
            magnifyForward.setDisabled(true);
            magnifyBackward.setDisabled(true);
          } else {
            magnifyForward.setDisabled(false);
            magnifyBackward.setDisabled(true);
          }
          console.log("magnify");
          await m.update({
            embeds: [await buildFull(aimList[ind], innerInd, user, mod)],
            components: [row4, row5],
          })
        }
        if (m.customId === "reset" + epoch) {
          innerInd = 0;
          mod = "";
          magnifyMapCount = await aimScores.count({
            where: { map_id: aimList[ind].map_id },
          })
          if(magnifyMapCount < 15){
            magnifyForward.setDisabled(true);
            magnifyBackward.setDisabled(true);
          } else {
            magnifyForward.setDisabled(false);
            magnifyBackward.setDisabled(true);
          }
          console.log("magnify");
          await m.update({
            embeds: [await buildFull(aimList[ind], innerInd, user, mod)],
            components: [row4, row5],
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
                if (ind == 0) {
                  backward.setDisabled(true);
                }
                if (ind == maxIndex) {
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

