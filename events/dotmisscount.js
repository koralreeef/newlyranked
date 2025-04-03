const { Events, EmbedBuilder } = require('discord.js');
const { aimLists, aimScores, osuUsers } = require('../db/dbObjects.js');
const { lightskyblue } = require("color-name");

const regex = /^\.misscount /gm;

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
        if (regex.test(msg.substring(0, 11))) {
            let user = msg.substring(11);
            console.log(user)
            const check = await osuUsers.findOne({ where: { username: user } });
            if (check) {
                // ITS SHIT
                const maps = await aimLists.findAll({         
                order: [
                    ["map_id", "DESC"],
                    ]}
                )
                const hrArray = await aimScores.findAll({
                where: { username: check.username, mods: "+HR" },                 
                order: [["map_id", "DESC"]] })
                const nmArray = await aimScores.findAll({
                where: { username: check.username, mods: "+NM" },                 
                order: [["map_id", "DESC"]] })
                let hrMisscount = 0;
                let hrString = "\nnot enough hr scores to show full list :(";
                let nmMisscount = 0;
                let nmString = "\nnot enough nm scores to show full list :(";
                let uID = hrArray[0].user_id ?? nmArray[0].user_id;
                let totalString = "\nnot enough scores to show full list :(";
                let totalMisscount = 0;
                console.log(hrArray.length)
                if (hrArray.length == maps.length) {
                    console.log("penis")
                    hrString = "\n";
                    for (score in hrArray) {
                        hrMisscount = hrMisscount + hrArray[score].misscount;
                        if(score != maps.length - 1){
                        hrString = hrString + hrArray[score].misscount + "  |  "
                        } else {
                        hrString = hrString + hrArray[score].misscount
                        }          
                    }
                }
                if (nmArray.length == maps.length) {
                    nmString = "\n";
                    for (score in nmArray) {
                        nmMisscount = nmMisscount + nmArray[score].misscount;
                        if(score != maps.length - 1){
                        nmString = nmString + nmArray[score].misscount + "  |  "
                        } else {
                        nmString = nmString + nmArray[score].misscount
                        }       
                    }
                }
                if (nmArray.length == maps.length && hrArray.length == maps.length) {
                    totalMisscount = hrMisscount + nmMisscount
                    totalString = ""
                }
                if(hrMisscount == 0)
                    hrMisscount = -1;
                if(nmMisscount == 0)
                    nmMisscount = -1;
                if(totalMisscount == 0)
                    totalMisscount = -1;
                const misscountEmbed = new EmbedBuilder()
                    .setAuthor({ name: "misscount totals for "+user,
                        iconURL: "https://a.ppy.sh/"+uID
                    })
                    .setDescription("hr misscount: **"+hrMisscount+"**"+hrString
                    +"\nnm misscount: **"+nmMisscount+"**"+nmString
                    +"\ntotal misscount: **"+totalMisscount+"**"+totalString)
                    .setColor(lightskyblue)
                    .setFooter({text : "great job!"});
                return message.channel.send({ embeds: [misscountEmbed] })
            } else {
                return message.channel.send("user not found, use /osuset")
            }
        }
    }
}

//https://discordjs.guide/popular-topics/canvas.html#getting-started