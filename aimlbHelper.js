const { EmbedBuilder } = require('discord.js');
const { aimScores, osuUsers } = require('./db/dbObjects.js');
const { lightskyblue } = require("color-name");

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
  if (mod != "") {
    scores = await aimScores.findAll({
      where: { map_id: map.map_id, mods: mod, collection: map.collection },
      order: [
        ["misscount", "ASC"],
        ["date", "ASC"]
      ]
    })
  }
  const author = await osuUsers.findOne({ where: { osu_id: user } })
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
      if (current.hidden) hidden = " (HD)"
      let date = Date.parse(current.date);
      let season = "";
      if (current.past_season) season = "**(" + current.past_season + ")**"
      let timestamp = Math.floor(date / 1000) //remove last subtraction after dst
      userScore = ("**#" + index + "** **__[" + current.username + "](https://osu.ppy.sh/users/" + current.user_id + ")__** • **" + current.misscount + "** <:miss:1324410432450068555> ** " + current.mods + hidden + "**  <t:" + timestamp + ":R> " + season + "\n **"
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
      if (current.hidden) hidden = " (HD)"
      let index = Number(scor) + 1
      let date = Date.parse(scores[scor].date);
      let timestamp = Math.floor(date / 1000) //remove last subtraction after dst
      let season = "";
      if (current.past_season) season = "**(" + current.past_season + ")**"
      if (current.user_id == user) {
        scoreString = scoreString + ("**#" + index + "** **__[" + current.username + "](https://osu.ppy.sh/users/" + current.user_id + ")__** • **" + current.misscount + "** <:miss:1324410432450068555> ** " + current.mods + hidden + "**  <t:" + timestamp + ":R> " + season + "\n **"
          + current.accuracy + "%  • ** **" + current.combo + "x**/" + current.max_combo + " • " + score.toLocaleString() + "\n")
        selfScore = selfScore + ("**#" + index + "** **__[" + current.username + "](https://osu.ppy.sh/users/" + current.user_id + ")__** • **" + current.misscount + "** <:miss:1324410432450068555> ** " + current.mods + hidden + "**  <t:" + timestamp + ":R> " + season + "\n **"
          + current.accuracy + "%  • ** **" + current.combo + "x**/" + current.max_combo + " • " + score.toLocaleString() + "\n")
      } else {
        scoreString = scoreString + ("**#" + index + "** **[" + current.username + "](https://osu.ppy.sh/users/" + current.user_id + ")** • **" + current.misscount + "** <:miss:1324410432450068555> ** " + current.mods + hidden + "**  <t:" + timestamp + ":R> " + season + "\n **"
          + current.accuracy + "%  • ** **" + current.combo + "x**/" + current.max_combo + " • " + score.toLocaleString() + "\n")
      }
      //i barely know how this is working jesus christ
      if (index % 15 == 0) {
        const check = [];
        for (userscore in userScores) {
          if (!scoreString.includes(userScores[userscore])) {
            check.push(userScores[userscore])
          }
        }
        if (check.length > 0) {
          scoreString = scoreString + "\n__**" + author.username + "'s score (s):**__ \n";
          for (userscore in check) {
            scoreString = scoreString + check[userscore]
          }
        }
        scoreArray.push(scoreString);
        scoreString = "";
      }
    }
    const check = [];
    for (userscore in userScores) {
      if (!scoreString.includes(userScores[userscore])) {
        check.push(userScores[userscore])
      }
    }
    if (check.length > 0) {
      scoreString = scoreString + "\n__**" + author.username + "'s score (s):**__ \n";
      for (userscore in check) {
        scoreString = scoreString + check[userscore]
      }
    }
    scoreArray.push(scoreString);
  }
  //console.log(userScores)
  //console.log(userScores.length)
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
  let mods = ""
  if (map.required_hr && map.required_dt) mods = "+DTHR"
  else if (map.required_dt) mods = "+DT"
  else if (map.required_hr) mods = "+HR"
  //console.log(map)
  const mapInfo = map.artist + " - " + map.title + " [" + map.difficulty + "] " + mods
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
      if (bro.past_season) season = "**(" + bro.past_season + ")**"
      if (bro.hidden) {
        hidden = " (HD)"
      }
      if (bro.user_id == user) {
        scoreArray = scoreArray + ("**#" + index + "** **__[" + bro.username + "](https://osu.ppy.sh/users/" + scores[score].user_id + ")__** • **" + bro.misscount + "** <:miss:1324410432450068555> ** " + bro.mods + hidden + "**  <t:" + timestamp + ":R> " + season + "\n **"
          + bro.accuracy + "%  • ** **" + bro.combo + "x**/" + bro.max_combo + " • " + bro.score.toLocaleString() + "\n")
      } else {
        scoreArray = scoreArray + ("**#" + index + "** **[" + bro.username + "](https://osu.ppy.sh/users/" + scores[score].user_id + ")** • **" + bro.misscount + "** <:miss:1324410432450068555> ** " + bro.mods + hidden + "**  <t:" + timestamp + ":R> " + season + "\n  **"
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

module.exports = { buildFull, buildEmbed };