const { Events, EmbedBuilder } = require('discord.js');
const { Client } = require("osu-web.js");
const { lightskyblue } = require('color-name');
const { clientIDv2, clientSecret, AccessToken } = require("../config.json");
const { getAccessToken } = require('../helper.js');
const { osuUsers } = require('../db/dbObjects.js');
const rosu = require("rosu-pp-js");
const { tools, v2, auth } = require('osu-api-extended')
const fs = require("fs");


const buildEmbed = async (embedString, user) => {
    let rbEmbed = new EmbedBuilder()
    .setAuthor({ name: "Most recent scores in "+user.username+"'s top 100: ",
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

  for(let i = 0; i < 5; i++){
    const score = sorted[i][0];
    //console.log(score);
    const maxcombo = score.maximum_statistics.great + score.maximum_statistics.legacy_combo_increase; 
    let modString = "";
    let beatmapString = "**["+score.beatmapset.artist+" - "+score.beatmapset.title+" ["+score.beatmap.version+"]";
    let diffString = score.beatmap.version;
    const miss = score.statistics.miss ?? 0;
    let rank = ""; //implement custom emojiz
    const timestamp = Math.floor(sorted[i][1]/1000);

    for(let mod in score.mods){
      //ehhhhh
      if(score.mods[mod].acronym == "CL"){
        modString = modString + "CL";
      } else {
      modString = score.mods[mod].acronym + modString;
      }
    }
    const result = await tools.download_beatmaps({
      type: 'difficulty',
      host: 'osu',
      id: score.beatmap.id,
      file_path: "./maps/"+score.beatmap.id+".osu"
    });

    const bytes = fs.readFileSync("./maps/"+score.beatmap.id+".osu");
    let map = new rosu.Beatmap(bytes);
    const maxAttrs = new rosu.Performance({ 
        mods: modString,
        cs: map.cs, 
        od: map.od,
        ar: map.ar 
     }).calculate(map);
    //console.log(maxAttrs.difficulty.stars);
    const stars = (maxAttrs.difficulty.stars).toFixed(2);
    map.free();
    fs.unlink("./maps/"+score.beatmap.id+".osu", function(err){
        console.log(err);
    });

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
    switch(score.rank){
      case "SSH":
          rank = "<:sshidden:1324402826255929407>"
          break;
      case "SH":
          rank = "<:Srankhidden:1324397032793964636>"
          break;
      case "SS":
          rank = "<:ssrank:1324402828340498542>"
          break;
      case "S":
          rank = "<:srank:1324402824511098931>"
          break;
      case "A":
          rank = "<:arank:1324402781850701824>"
          break;
      case "B":
          rank = "<:brank:1324402783952306188>"
          break;
      case "C":
          rank = "<:crank:1324402785843675177>"
          break;
      case "D":
          rank = "<:drank:1324402787840426105>"
          break;
      case "F":
          rank = "<:frank:1324404867208450068>"
          break;
      }
    scoreString = scoreString + "**#"+Number(score.index + 1)+"** "+beatmapString+"](https://osu.ppy.sh/b/"+score.beatmap_id+") ["+stars+"✰]**\n"+
    "**"+rank+"** **"+score.pp.toFixed(2)+"PP** ("+(score.accuracy * 100).toFixed(2)+"%) [**"+score.max_combo+"x**/"+maxcombo+"] "+miss+" <:miss:1324410432450068555> **+"+modString+"** <t:"+timestamp+":R>\n"; 
  }

  return scoreString;
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
