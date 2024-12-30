const fs = require("fs")
const undici = require('undici');
const { pipeline } = require('node:stream/promises');
const { Events, EmbedBuilder, AttachmentBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const { Client, LegacyClient, calcAccuracy, calcModStat } = require("osu-web.js");
const { lightskyblue } = require('color-name');
const { getAccessToken, client_cred, getBeatmapID } = require("../helper.js");
const { clientIDv2, clientSecret, AccessToken } = require("../config.json")
const { tools, v2, auth } = require('osu-api-extended')
const { hr, ez } = calcModStat;
const regex = /^\.preview \d{1,7}/gm;
const axios = require('axios');
const rosu = require("rosu-pp-js");
const legacyApi = new LegacyClient(AccessToken);
//refresh every hour for new tokens gg
let scoreArray = [];
let maxIndex = 0;
function sleep(delay) {
  var start = new Date().getTime();
  while (new Date().getTime() < start + delay);
}

async function calcPP(score, modString, maxAttrs) {
  const hits = {
          ok: score.count100 ?? 0,
          great: score.count300 ?? 0,
          meh: score.count50 ?? 0,
          miss: score.countmiss ?? 0,
      }
      if(modString.includes("DT"))
          clockRate = 1.5;
      if(modString.includes("HT"))
          clockRate = 0.75;
      let acc = (calcAccuracy.osu(Number(hits.great), Number(hits.ok), Number(hits.meh), Number(hits.miss)) * 100).toFixed(2);
      //console.log(maxAttrs.pp);
      const currAttrs = new rosu.Performance({
            mods: modString, // Must be the same as before in order to use the previous attributes!
            misses: Number(hits.miss),
            lazer: false,
            accuracy: Number(acc),
            combo: Number(score.maxcombo),
        }).calculate(maxAttrs); 
        //console.log(currAttrs);
      const currentPP = (currAttrs.pp).toFixed(2);
      return {currPP: currentPP, acc: acc}
}

const buildEmbed = async(title, beatmap, first, index) => {
  //console.log(beatmap)
    const embed = new EmbedBuilder()
    .setAuthor({ name: title,
        url: "https://osu.ppy.sh/b/"+beatmap.id,
        iconURL: "https://a.ppy.sh/"+first
    })
    .setThumbnail("https://b.ppy.sh/thumb/"+beatmap.beatmapset.id+"l.jpg")
    .setDescription(`\n${scoreArray[index]}`)
    .setColor(lightskyblue)
    .setFooter({text : "  Page "+Number(index + 1)+"/"+Number(maxIndex)+" • "+beatmap.status+" mapset by "+beatmap.beatmapset.creator,
        iconURL: "https://a.ppy.sh/"+beatmap.beatmapset.user_id 
    });
    return embed;
}

const start = async (bID, mod) => {
  console.log(bID+" asdcasd");
    const url = new URL(
      "https://osu.ppy.sh/oauth/token"
    );
    
    const headers = {
      "Accept": "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    };
    
    let body = "client_id="+clientIDv2+"&client_secret="+clientSecret+"&grant_type=client_credentials&scope=public";
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: body,
    }).then(response => response.json());
    let token = response.access_token;
    api = new Client(token);
    await auth.login({
      type: 'v2',
      client_id: clientIDv2,
      client_secret: clientSecret,
      cachedTokenPath: './test.json' // path to the file your auth token will be saved (to prevent osu!api spam)
  });
  let id = bID;
    const beatmap = await v2.beatmaps.details({
      type: 'difficulty',
      id: id
    });
    const result = await tools.download_beatmaps({
      type: 'difficulty',
      host: 'osu',
      id: id,
      file_path: "./maps/"+id+".osu"
  });

    const bytes = fs.readFileSync("./maps/"+id+".osu");
    let map = new rosu.Beatmap(bytes);
    let modString = mod.toUpperCase() + "CL";
    let enumSum = 0;
    let limit = 100;

    //there has to be a better way
    if(modString.includes("HR"))
      enumSum = enumSum + 16;
    if(modString.includes("HD"))
      enumSum = enumSum + 8;
    if(modString.includes("DT"))
      enumSum = enumSum + 64;
    if(modString.includes("NF"))
      enumSum = enumSum + 1;
    if(modString.includes("EZ"))
      enumSum = enumSum + 2;
    if(modString.includes("SD"))
      enumSum = enumSum + 32;

    //work on string parsing mods and have a bitwise equivalent sum that goes into the mods param
    const res = await axios.get("https://osu.ppy.sh/api/get_scores?k="+AccessToken+"&b="+id+"&mods="+enumSum+"&limit="+limit);
    const scores = res.data;
    const maxAttrs = new rosu.Performance({ mods: modString, lazer: false }).calculate(map);
    const maxPP = (maxAttrs.pp).toFixed(2);
    maxIndex = Math.floor(Number((scores.length)/10));
    console.log(maxIndex);
    scoreArray = [];
    let scoreString = "";
    let list;
    let first = "";
    let count = 1;
    //console.log(maxAttrs);
    for(let i = 0; i < scores.length; i++){
      if(i == 0)
      first = scores[i].user_id;
      const calc = await calcPP(scores[i], modString, maxAttrs);
      const score = Number(scores[i].score);
      let date = Date.parse(scores[i].date);
      let timestamp = Math.floor(date/1000) - (8 * 3600); //remove last subtraction after dst
      scoreString = scoreString + ("**#"+(i + 1)+"** **["+scores[i].username+"](https://osu.ppy.sh/users/"+scores[i].user_id+")**: "+score.toLocaleString()+" • **"+Number(calc.currPP).toFixed(2)+"**/"+maxPP+"PP  **+"+modString+"**\n"
      +"**"+scores[i].rank+"** "+Number(calc.acc).toFixed(2)+"% { **"+scores[i].maxcombo+"x**/"+beatmap.max_combo+ " } "+scores[i].countmiss+" :x: • <t:"+timestamp+":R>\n");
      if(count%10 == 0){
        scoreArray.push(scoreString);
        scoreString = "";
      }
      count++;
    }
    scoreArray.push(scoreString);
    //list = scoreArray.join('\n');
    let title = "Leaderboard for "+beatmap.beatmapset.artist+" - "+beatmap.beatmapset.title+" ["+beatmap.version+"]["+maxAttrs.difficulty.stars.toFixed(2)+"✰] +"+modString;

    return {beatmap: beatmap, first: first, list: list, title: title};
    //https://github.com/ppy/osu-api/wiki#apiget_scores for bitwise conversion
}

async function update (msgRef, embed) {
  await msgRef.edit({embeds: [embed],
    components: []})
}

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        let msg = message.content;
        console.log(msg.substring(0, 5));
        if(msg.substring(0, 5) === ".lb +" || msg === ".lb"){
            let ind = 0;
            const epoch = Date.now();
        
            const back = new ButtonBuilder()
            .setCustomId('back' + epoch)
            .setLabel('<<')
            .setDisabled(true)
            .setStyle(ButtonStyle.Primary);

            const forward = new ButtonBuilder()
            .setCustomId('forward' + epoch)
            .setLabel('>>')
            .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder()
            .addComponents(back, forward);
    
            const row2 = new ActionRowBuilder()
            .addComponents(back, forward);

            const sorted = await start(getBeatmapID(), msg.substring(5));
            const embed = await buildEmbed(sorted.title, sorted.beatmap, sorted.first, ind);
            const msgRef = await message.channel.send({embeds: [embed],
                                  components: [row] 
            });

            const filter = (message) => message.user.id === message.user.id;
            const collector = message.channel.createMessageComponentCollector({
              filter: filter,
              time: 60_000,
            });
            collector.on("collect", async (m) => {
              //gray out buttons on page end

              if (m.customId === "back" + epoch) {
                ind--;
                if (ind == 0) back.setDisabled(true);
                forward.setDisabled(false);
                console.log("backwards");
                await m.update({
                  embeds: [await buildEmbed(sorted.title, sorted.beatmap, sorted.first, ind)],
                  components: [row],
                })
              }
              if (m.customId === "forward" + epoch) {
                ind++
                if (ind == maxIndex - 1) forward.setDisabled(true);
                back.setDisabled(false);
                console.log("forwards");
                await m.update({
                  embeds: [await buildEmbed(sorted.title, sorted.beatmap, sorted.first, ind)],
                  components: [row2],
                })
              }
            });
            collector.on("end", async () => {
              await msgRef.edit({
                embeds: [await buildEmbed(sorted.title, sorted.beatmap, sorted.first, ind)],
                components: [],
              });
            });
            
        }
    }
  }
//idk how to hook it up but we'll live
