const { Events, EmbedBuilder } = require('discord.js');
const { aimLists, aimScores, osuUsers } = require('../db/dbObjects.js');
const { lightskyblue } = require("color-name");
const { scores } = require('osu-api-extended/dist/routes/v2.js');
let ending = "";

async function buildEmbed() {
  const userIDs = await osuUsers.findAll()
  const collection = await aimLists.findAll({ where: { is_current: 1 } })
  const validUsers = []
  const collectionName = collection[0].collection
  let userString = "";
  let special = "";
  ending = collectionName + " ends <t:1747094580:R>"
  for (id in userIDs) {
    let total = 0;
    let totalMaps = 0;
    let nmMaps = 0;
    let hrMaps = 0;
    const found = await aimScores.findOne({ where: { user_id: userIDs[id].osu_id } })
    if (found) {
      const scores = await aimScores.findAll({ where: { user_id: userIDs[id].osu_id, is_current: 1 } })
      const mapIDs = []
      const unique = []
      //???
      for(score in scores){
        if(!mapIDs.includes(scores[score].map_id)){
          mapIDs.push(scores[score].map_id)
          unique.push(scores[score])
        }
      }
      //console.log(mapIDs)
      let processing = true
      while(processing) {
        const scoreNM = await aimScores.findOne({ where: { user_id: userIDs[id].osu_id, map_id: unique[totalMaps].map_id, is_current: 1, mods: "+NM" } })
        const scoreHR = await aimScores.findOne({ where: { user_id: userIDs[id].osu_id, map_id: unique[totalMaps].map_id, is_current: 1, mods: "+HR" } })
        if (scoreNM && scoreHR) {
          totalMaps++;
          if (scoreNM.misscount > scoreHR.misscount) {
            total = total + scoreHR.misscount
            hrMaps++;
          } else if (scoreNM.misscount < scoreHR.misscount){
            total = total + scoreNM.misscount
            nmMaps++;
          } else if (scoreNM.misscount == scoreHR.misscount)
            total = total + scoreNM.misscount
        } else {
          if(scoreNM){
            totalMaps++;
            total = total + scoreNM.misscount
            nmMaps++;
          } else if(scoreHR){
            totalMaps++;
            total = total + scoreHR.misscount
            hrMaps++;
          } else {

          }
        }
        if(totalMaps == unique.length) processing = false;
      }
      if(nmMaps > hrMaps){
        special = "(NM+)"
        if(hrMaps == 0) special = "(NM++)"
      }
      else if(nmMaps < hrMaps){
        special = "(HR+)"
        if(nmMaps == 0) special = "(HR++)"
      }
      else if(nmMaps == hrMaps){
        special = "(NM/HR)"
      }
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
      //console.log(userIDs[id].username+": NM: "+nmMisscount+"x"+nmAsterik+", HR: "+hrMisscount+"x"+hrAsterik)
      //console.log("maps played: "+mapsPlayed+"; "+scoresNM.length+"/"+scoresHR.length+" NM/HR plays")
    }
  }
  validUsers.sort(function (user1, user2) {
    if (user1.mapcount < user2.mapcount) return 1;
    if (user1.mapcount > user2.mapcount) return -1;
    if (user1.misscount > user2.misscount) return 1;
    if (user1.misscount < user2.misscount) return -1;
  });
  //console.log(validUsers)
  for (user in validUsers) {
    const current = validUsers[user];
    let totalString = "";
    if(current.mapcount != collection.length){
      totalString = "**"+current.mapcount + "**/" + collection.length + " scores"
    }
    const pageNum = Number(user) + 1;
    userString = userString + ("**#" + pageNum + " [" + current.username + "](https://osu.ppy.sh/users/" + current.user_id + ") " + current.misscount + " • ** <:miss:1324410432450068555> "+totalString+" **" +current.speciality+"**\n")
  }
  const d = new Date();

  const scoreEmbed = new EmbedBuilder()
    .setAuthor({ name: "Leaderboard for: " + collectionName + "\nCurrent misscount leader: "+validUsers[0].username, iconURL: "https://a.ppy.sh/" + validUsers[0].user_id })
    .setDescription(userString)
    .setColor(lightskyblue)
    .setFooter({ text: "updates every 15 minutes probably\nlast updated "+d.toUTCString()});
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
    if(message.author.id == "1282417809455845479"){
      if(msg.includes("new leaderboard rank: ")){
        const channel = message.client.channels.cache.get("1364153568684281877");
        const embed = await channel.messages.fetch("1364247309973458996");
        const collection = await buildEmbed();
        await embed.edit({ content: ending, embeds: [collection] });
      }
    }
    if (msg === ".r") {
      if (message.author.id == "109299841519099904") {
        const channel = message.client.channels.cache.get("1281401565571452979");
        const embed = await channel.messages.fetch("1364462119436812348");
        const collection = await buildEmbed();
        await embed.edit({ content: ending, embeds: [collection] });
      }
    }
  }
}

//https://discordjs.guide/popular-topics/canvas.html#getting-started