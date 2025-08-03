const { Events, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { aimLists, aimScores, osuUsers } = require('../db/dbObjects.js');
const { leaderboardChannel, leaderboardMessage, currentD1Collection, currentD2Collection, botID, end, the } = require('../config.json');
const { setDivToggle, getDivToggle, getPPToggle } = require('../helper.js');
const { lightskyblue } = require("color-name");
let ending = end;
let theme = "high cs";

async function buildEmbed(toggle) {
  console.log("poaaaop")
  const userIDs = await osuUsers.findAll()
  let divName = currentD1Collection;
  if (toggle) divName = currentD2Collection;
  const collection = await aimLists.findAll({ where: { collection: divName } })
  const validUsers = []
  const collectionName = collection[0].collection
  let userString = "";
  let special = "";
  for (id in userIDs) {
    let total = 0;
    let totalMaps = 0;
    let nmMaps = 0;
    let hrMaps = 0;
    let dtMaps = 0;
    const found = await aimScores.findOne({ where: { user_id: userIDs[id].osu_id, collection: divName } })
    if (found) {
      const scores = await aimScores.findAll({ where: { user_id: userIDs[id].osu_id, collection: divName } })
      const mapIDs = []
      const unique = []
      //???
      for (score in scores) {
        if (!mapIDs.includes(scores[score].map_id)) {
          mapIDs.push(scores[score].map_id)
          unique.push(scores[score])
          //console.log(unique[score].map_id+"/"+unique[score].misscount)
        }
      }

      let processing = true
      while (processing) {
        //ehhhhhhhhhhhhhhhhh
        let dt = false;
        let scoreNM = await aimScores.findOne({ where: { user_id: userIDs[id].osu_id, map_id: unique[totalMaps].map_id, mods: "+NM", required_dt: false, required_hr: false }, order: [["misscount", "asc"]] })
        if (!scoreNM) {
          scoreNM = await aimScores.findOne({ where: { user_id: userIDs[id].osu_id, map_id: unique[totalMaps].map_id, mods: "+DT", required_dt: true, required_hr: false }, order: [["misscount", "asc"]] })
          console.log("dt score")
          if (scoreNM) dt = true
        }
        const scoreHR = await aimScores.findOne({ where: { user_id: userIDs[id].osu_id, map_id: unique[totalMaps].map_id, mods: "+HR", required_dt: false, required_hr: true }, order: [["misscount", "asc"]] })
        const scoreDTHR = await aimScores.findOne({ where: { user_id: userIDs[id].osu_id, map_id: unique[totalMaps].map_id, mods: "+DTHR", required_dt: true, required_hr: true }, order: [["misscount", "asc"]] })
        if (scoreNM && scoreHR && !dt) {
          totalMaps++;
          if (scoreNM.misscount > scoreHR.misscount) {
            total = total + scoreHR.misscount
            hrMaps++;
          } else if (scoreNM.misscount < scoreHR.misscount) {
            total = total + scoreNM.misscount
            nmMaps++;
          } else if (scoreNM.misscount == scoreHR.misscount) {
            total = total + scoreNM.misscount
            hrMaps++;
          }
        } else {
          if (scoreNM) {
            totalMaps++;
            total = total + scoreNM.misscount
            if (dt) { dtMaps++ } else { nmMaps++; }
          } else if (scoreHR) {
            totalMaps++;
            total = total + scoreHR.misscount
            hrMaps++;
          } else if (scoreDTHR) {
            totalMaps++;
            total = total + scoreDTHR.misscount
            dtMaps++;
          }
        }
        if (totalMaps == unique.length) processing = false;
      }
      special = "(" + nmMaps + " NM/" + hrMaps + " HR"
      //ITS TERRIBLE BRO FIX THIS
      if (nmMaps == 0) special = "(" + hrMaps + " HR"
      if (hrMaps == 0) special = "(" + nmMaps + " NM"
      if (dtMaps > 0) special = special + "/" + dtMaps + " DT"
      special = special + ")"


      //console.log(userIDs[id].username+": "+nmMaps+"/"+hrMaps)
      const leaderboardMap = {
        username: userIDs[id].username,
        user_id: userIDs[id].osu_id,
        mapcount: totalMaps,
        misscount: total,
        speciality: special,
      }
      validUsers.push(leaderboardMap)
      //console.log(leaderboardMap)
      //console.log(userIDs[id].username + ": NM: " + nmMisscount + "x" + nmAsterik + ", HR: " + hrMisscount + "x" + hrAsterik)
      //console.log("maps played: "+mapsPlayed+"; "+scoresNM.length+"/"+scoresHR.length+" NM/HR plays")
    }
  }
  validUsers.sort(function (user1, user2) {
    if (user1.mapcount < user2.mapcount) return 1;
    if (user1.mapcount > user2.mapcount) return -1;
    if (user1.misscount > user2.misscount) return 1;
    if (user1.misscount < user2.misscount) return -1;
  });
  for (let i = 0; i < 25; i++) {
    if (i < validUsers.length) {
      const current = validUsers[i];
      let totalString = "";
      if (current.mapcount != collection.length) {
        totalString = "** • ** **" + current.mapcount + "**/" + collection.length + " scores"
      }
      const pageNum = Number(i) + 1;
      userString = userString + ("**#" + pageNum + " [" + current.username + "](https://osu.ppy.sh/users/" + current.user_id + ") • " + current.misscount + " ** <:miss:1324410432450068555> " + totalString + " **" + current.speciality + "**\n")
    }
  }
  const d = new Date();
  const scoreEmbed = new EmbedBuilder()
    .setAuthor({ name: "Leaderboard for: " + collectionName + "\nCurrent misscount leader: " + validUsers[0].username, iconURL: "https://a.ppy.sh/" + validUsers[0].user_id })
    .setDescription(userString)
    .setColor(lightskyblue)
    .setFooter({ text: "season theme: "+theme+"\nlast updated " + d.toUTCString() + "\ncurrent mod: none\ncurrent leaderboard: misscount" });
  //console.log("dfsdf")
  //console.log(scoreEmbed)
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
    if (message.author.id == botID) {
      console.log(msg)
      if (msg.includes("logged new ") || msg.includes("new leaderboard rank:") || msg.includes("gained")) {
        const channel = message.client.channels.cache.get(leaderboardChannel);
        const embed = await channel.messages.fetch(leaderboardMessage);
        const collection = await buildEmbed(getDivToggle());
        await embed.edit({ content: ending, embeds: [collection] });
      }
    }
    if (msg === ".r") {
      if (message.author.id == "109299841519099904") {
        const channel = message.client.channels.cache.get(leaderboardChannel);
        const embed = await channel.messages.fetch(leaderboardMessage);
        const collection = await buildEmbed(getDivToggle());
        await embed.edit({ content: ending, embeds: [collection] });
      }
    }
  }
}

//https://discordjs.guide/popular-topics/canvas.html#getting-started