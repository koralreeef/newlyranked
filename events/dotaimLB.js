const { Events, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { Client } = require("osu-web.js");
const { getAccessToken } = require('../helper.js');
const { aimLists, aimScores } = require('../db/dbObjects.js');
const { lightskyblue } = require("color-name");

async function buildEmbed(map) {
    const api = new Client(await getAccessToken());
    let beatmap;
    try{
        beatmap = await api.beatmaps.getBeatmap(map.map_id);
    } catch (err) {
        return
    }
    const mapInfo = beatmap.beatmapset.artist+" - "+beatmap.beatmapset.title+" ["+beatmap.version+"]"
    const scores = await aimScores.findAll({ 
        where: {map_id: map.map_id },
        order: [
            ["misscount", "ASC"],
        ]
    })
    let scoreArray = ""
    let first;
    for (score in scores){
        let bro = scores[score]
        first = bro.user_id
        let index = Number(score) + 1
        scoreArray = scoreArray + ("**#"+index+"** **"+bro.username+"** • **"+bro.combo+"x**/"+bro.max_combo+" • **"+bro.misscount+"** <:miss:1324410432450068555>** \n"+bro.accuracy+"%  • "+bro.score.toLocaleString()+" "+bro.mods+"**\n")
    }
    if(scoreArray === ""){
        scoreArray = "**no scores yet :(**"
    }
    const scoreEmbed = new EmbedBuilder()
    .setAuthor({ name: "Misscount leaderboard for: \n"+mapInfo,
        url: "https://osu.ppy.sh/b/"+beatmap.id,
        iconURL: "https://a.ppy.sh/"+first
    })
    .setThumbnail("https://b.ppy.sh/thumb/"+beatmap.beatmapset.id+"l.jpg")
    .setDescription(`\n${scoreArray}`)
    .setColor(lightskyblue)
    .setFooter({text : beatmap.status+" mapset by "+beatmap.beatmapset.creator,
        iconURL: "https://a.ppy.sh/"+beatmap.beatmapset.user_id 
    });
    console.log(scoreEmbed)
    return scoreEmbed;
  }
  

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
      const api = new Client(await getAccessToken());
      const msg = message.content;
      if(msg.toLowerCase() === ".aimlb") {
        const aimList = await aimLists.findAll(); 
    
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
        message.channel.send({ embeds: [leaderboard], components: [row] });
        
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
              if (ind == maxIndex - 1) forward.setDisabled(true);
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
//idk how to hook it up but we'll live
