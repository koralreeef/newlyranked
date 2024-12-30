const { Events, EmbedBuilder } = require('discord.js');
const { Client } = require("osu-web.js");
const { lightskyblue } = require('color-name');
const { clientIDv2, clientSecret, AccessToken } = require("../config.json");
const { getAccessToken } = require('../helper.js');
const { osuUsers } = require('../db/dbObjects.js');
const { v2, auth } = require('osu-api-extended')

const buildEmbed = async (embedString, user) => {
    let rbEmbed = new EmbedBuilder()
    .setAuthor({ name: "Most recent scores in "+user.username+"'s Top 100: ",
        url: "https://osu.ppy.sh/users/"+user.id,
        iconURL: "https://a.ppy.sh/"+user.id
    })
    .setDescription(embedString)
    .setThumbnail("https://a.ppy.sh/"+user.id)
    .setFooter({ text : "great work!"})
    .setColor(lightskyblue);
    return rbEmbed;
}

const start = async (uID) => {
    await auth.login({
      type: 'v2',
      client_id: clientIDv2,
      client_secret: clientSecret,
      cachedTokenPath: './test.json' // path to the file your auth token will be saved (to prevent osu!api spam)
  });
  
  const result = await v2.scores.list({
    type: 'user_best',
    mode: 'osu',
    limit: 100,
    user_id: uID,
  });
  let scoreArray = new Map();
  let scoreString = "";

  for(let i in result){
  let date = Date.parse(result[i].ended_at);
  scoreArray.set(result[i], date);
  }

  const sorted = [...scoreArray].sort((a, b) => b[1] - a[1]);

  for(let i = 0; i < 10; i++){
  let score = sorted[i][0];
  let maxcombo = score.maximum_statistics.great + score.maximum_statistics.legacy_combo_increase; 
  let modString = "";

  for(let mod in score.mods){
    modString = modString + score.mods[mod].acronym;
  }
  let beatmapString = "**["+score.beatmapset.artist+" - "+score.beatmapset.title+" ["+score.beatmap.version+"]";
  let diffString = score.beatmap.version;
  if(beatmapString.length > 50){
    if(diffString.length > 20){
      diffString = diffString.substring(0, 17) + "...";
      beatmapString = "**["+score.beatmapset.artist+" - "+score.beatmapset.title+" ["+diffString+"]";
    }
    beatmapString = "**["+score.beatmapset.title+" ["+diffString+"]";
    if(beatmapString.length > 50){
      beatmapString = "**["+score.beatmapset.title.substring(0, 25)+"... ["+diffString+"]";
    }
  }
  let rank = "";
  let miss = score.statistics.miss ?? 0;
  let timestamp = Math.floor(sorted[i][1]/1000);
  scoreString = scoreString + "**#"+Number(score.index + 1)+"** "+beatmapString+"](https://osu.ppy.sh/b/"+score.beatmap_id+")**\n"+
  "**"+score.rank+"** **"+score.pp.toFixed(2)+"PP** ("+(score.accuracy * 100).toFixed(2)+"%) [**"+score.max_combo+"x**/"+maxcombo+"] "+miss+" :x: **+"+modString+"** <t:"+timestamp+":R>\n"; 
  }
  return scoreString;
  //console.log("this would be a new top play #"+newPlayIndex);
}

const regex = /^\.rb \D{1,}/gm;

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
      const api = new Client(await getAccessToken());
      const msg = message.content;
      let self = false;
      if(msg === ".rb") self = true; 
      if(regex.test(msg) || self) {
        let usr = msg.substring(4);
        let selfName = await osuUsers.findOne({ where: {user_id: message.author.id }});
        console.log(usr);

        let user;
        if(self && selfName) 
        usr = selfName.username;
        try{
            user = await api.users.getUser(usr, 'osu', 'username', {
                urlParams: {
                mode: 'osu'
                }
            });
        } catch (err) {
            return message.channel.send("couldnt find user");
        }
        try{
          const embedString = await start(user.id);
          const embed = await buildEmbed(embedString, user);
          return message.channel.send({ embeds: [embed]})
        } catch (err){
          console.log(err);
            return message.channel.send("found less than 5 top plays... were they recently banned?");
        }
      }
    }
  }
//idk how to hook it up but we'll live
