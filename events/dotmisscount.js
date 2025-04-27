const { Events, EmbedBuilder } = require('discord.js');
const { aimLists, aimScores, osuUsers } = require('../db/dbObjects.js');
const { currentD2Collection } = require('../config.json');
const { lightskyblue } = require("color-name");
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const regex = /^\.misscount/gm;

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
            let collectionStr = 0
            let username = "";
            if(msg.indexOf("u=") == -1){
                const self = await osuUsers.findOne({ where: { user_id: message.author.id } });
                if(self){
                username = self.username
                } else {
                    return await message.channel.send("use /osuset first")
                }
                collectionStr = msg.length;
            } else {
                username = msg.substring(msg.indexOf("u=") + 2)
                
                collectionStr = msg.indexOf("u=") - 1;
            }
            let collectionName = "";
            if(msg.indexOf("c=") > 0){
                collectionName = msg.substring(msg.indexOf("c=") + 2, collectionStr);
            }
            if(msg.substring(10, 11) == "2") {
                collectionName = currentD2Collection;
            }
            console.log(collectionName)
            console.log(username)
            if (msg === ".misscount"){
                const self = await osuUsers.findOne({ where: { user_id: message.author.id } });
                if(self){
                    username = self.username
                    } else {
                        return await message.channel.send("use /osuset first")
                    }
                is_current = 1;
            }
            const check = await osuUsers.findOne({ 
                where: { 
                    username: {
                        [Op.like]: username.toLowerCase() 
                    }
                }, 
            });
            if (check) {

                let hrArray = await aimScores.findAll({
                where: { collection: collectionName, user_id: check.osu_id, mods: "+HR" },                 
                order: [["map_id", "DESC"]] })

                let nmArray = await aimScores.findAll({
                where: { collection: collectionName, user_id: check.osu_id, mods: "+NM" },                 
                order: [["map_id", "DESC"]] })

                let maps = await aimLists.findAll({    
                    where: { collection: collectionName },     
                    order: [
                        ["map_id", "DESC"],
                        ]}
                    )
                // ITS SHIT

                if(collectionName.length > 0){
                    console.log("please "+collectionName)
                    maps = await aimLists.findAll({
                        where: { collection: collectionName },
                        order: [
                          ["map_id", "DESC"],
                        ]
                    })
                    console.log(maps)
                    if(maps.length < 1){
                        return message.channel.send("couldnt find collection")
                    }
                    hrArray = await aimScores.findAll({
                    where: { collection: collectionName, user_id: check.osu_id, mods: "+HR" },                 
                    order: [["map_id", "DESC"]] })
                    nmArray = await aimScores.findAll({
                    where: { collection: collectionName, user_id: check.osu_id, mods: "+NM" },                 
                    order: [["map_id", "DESC"]] })
                }

                let hrMisscount = 0;
                let hrBool = false;
                let hrString = "";
                let nmMisscount = 0;
                let nmBool = false;
                let nmString = "";
                let totalString = "\nnot enough scores to show full list :(";
                let totalMisscount = 0;
                let leftoversHR = "no scores found";

                console.log(hrArray.length)
                if (hrArray.length == maps.length) {
                    hrString = "\n";
                    for (score in hrArray) {
                        hrMisscount = hrMisscount + hrArray[score].misscount;
                        if(score != maps.length - 1){
                        hrString = hrString + "[" + hrArray[score].misscount + "]" + "(https://osu.ppy.sh/b/" + maps[score].map_id + ")  |  "
                        } else {
                        hrString = hrString + "[" + hrArray[score].misscount + "]" + "(https://osu.ppy.sh/b/" + maps[score].map_id + ")"
                        }       
                    }
                    hrBool = true
                    hrString = " **" + hrString + "**"
                    leftoversHR = "";
                }  else if (hrArray.length < maps.length) {
                    for (let i = 0; i < maps.length; i++){
                        let pageNum = i + 1
                        const score = await aimScores.findOne({where: {map_id: maps[i].map_id, user_id: check.osu_id, mods: "+HR"
                        }})
                        if(score){
                            if(leftoversHR === "no scores found"){
                                leftoversHR = ""
                            }
                            leftoversHR = leftoversHR + "[" + score.misscount + "]" + "(https://osu.ppy.sh/b/" + maps[i].map_id + ")  |  "
                            hrMisscount = hrMisscount + score.misscount
                            //console.log("hi "+i)
                        } else {
                            if(i != maps.length - 1){
                            hrString = hrString + "["+pageNum+"](https://osu.ppy.sh/b/" + maps[i].map_id + "), "
                            } else {
                            hrString = hrString + "["+pageNum+"](https://osu.ppy.sh/b/" + maps[i].map_id + ")"
                            }    
                            //console.log("missing "+i)
                        }
                    }
                }

                console.log(nmArray.length)
                let leftoversNM = "no scores found";
                if (nmArray.length == maps.length) {
                    console.log("poop")
                    nmString = "\n";
                    for (score in nmArray) {
                        nmMisscount = nmMisscount + nmArray[score].misscount;
                        if(score != maps.length - 1){
                        nmString = nmString + "[" + nmArray[score].misscount + "]" + "(https://osu.ppy.sh/b/" + maps[score].map_id + ")  |  "
                        } else {
                        nmString = nmString + "[" + nmArray[score].misscount + "]" + "(https://osu.ppy.sh/b/" + maps[score].map_id + ")"
                        }       
                    }
                    nmBool = true
                    
                    nmString = " **" + nmString + "**"
                    leftoversNM = "";
                } else if (nmArray.length < maps.length) {
                    for (let i = 0; i < maps.length; i++){
                        let pageNum = i + 1
                        const score = await aimScores.findOne({where: {map_id: maps[i].map_id, user_id: check.osu_id, mods: "+NM"
                        }})
                        if(score){
                            if(leftoversNM === "no scores found"){
                                leftoversNM = ""
                            }
                            leftoversNM = leftoversNM + "[" + score.misscount + "]" + "(https://osu.ppy.sh/b/" + maps[i].map_id + ")  |  "
                            nmMisscount = nmMisscount + score.misscount
                            //console.log("hi "+i)
                        } else {
                            if(i != maps.length - 1){
                            nmString = nmString + "["+pageNum+"](https://osu.ppy.sh/b/" + maps[i].map_id + "), "
                            } else {
                            nmString = nmString + "["+pageNum+"](https://osu.ppy.sh/b/" + maps[i].map_id + ")"
                            }    
                            //console.log("missing "+i)
                        }
                    }
                }
                if (nmArray.length == maps.length && hrArray.length == maps.length) {
                    totalMisscount = hrMisscount + nmMisscount
                    totalString = ""
                }
                if(!hrBool)
                    hrString = "* \n**" + leftoversHR + "** \nmissing hr plays on map(s): \n**" + hrString + "**"
                if(!nmBool)
                    nmString = "* \n**" + leftoversNM + "** \nmissing nm plays on map(s): \n**" + nmString + "**"
                if(leftoversHR === "no scores found"){
                    hrString = "\nno scores found"
                    hrMisscount = -1
                }
                if(leftoversNM === "no scores found"){
                    nmString = "\nno scores found"
                    nmMisscount = -1
                }
                if(totalMisscount == 0)
                    totalMisscount = -1;
                const misscountEmbed = new EmbedBuilder()
                    .setAuthor({ name: "misscount totals for "+check.username+"\ncollection: "+maps[0].collection,
                        iconURL: "https://a.ppy.sh/"+check.osu_id
                    })
                    .setDescription("hr misscount: **"+hrMisscount+"**"+hrString
                    +"\n\nnm misscount: **"+nmMisscount+"**"+nmString)
                    .setColor(lightskyblue)
                    .setFooter({text : "great job!"});
                return message.channel.send({ embeds: [misscountEmbed] })
            } else {
                return message.channel.send("user or collection not found, use /osuset")
            }
        }
    }
}

//https://discordjs.guide/popular-topics/canvas.html#getting-started