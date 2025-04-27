const { Events, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { aimLists, aimScores, osuUsers } = require('../db/dbObjects.js');
const { leaderboardChannel, leaderboardMessage, currentD1Collection, currentD2Collection } = require('../config.json');
const { lightskyblue } = require("color-name");
let ending = "";

async function buildEmbed(toggle) {
    const userIDs = await osuUsers.findAll()
    let divName = currentD1Collection;
    console.log(toggle)
    const board = toggle.pp;
    if(toggle.div) divName = currentD2Collection;
    const collection = await aimLists.findAll({ where: { collection: divName } })
    const validUsers = []
    const collectionName = divName
    let userString = "";
    let special = "";
    ending = "season 0 ends <t:1747094580:R>"
    for (id in userIDs) {
        let total = 0;
        let totalMaps = 0;
        let nmMaps = 0;
        let hrMaps = 0;
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
                }
            }
            //console.log(mapIDs)
            let processing = true
            while (processing) {
                const scoreNM = await aimScores.findOne({ where: { user_id: userIDs[id].osu_id, map_id: unique[totalMaps].map_id, mods: "+NM" } })
                const scoreHR = await aimScores.findOne({ where: { user_id: userIDs[id].osu_id, map_id: unique[totalMaps].map_id, mods: "+HR" } })
                if (scoreNM && scoreHR) {
                    totalMaps++;
                    if (scoreNM.misscount > scoreHR.misscount) {
                        if (board) {
                            total = total + scoreHR.score
                        } else {
                            total = total + scoreHR.misscount
                        }
                        hrMaps++;
                    } else if (scoreNM.misscount < scoreHR.misscount) {
                        if (board) {
                            total = total + scoreNM.score
                        } else {
                            total = total + scoreNM.misscount
                        }
                        nmMaps++;
                    } else if (scoreNM.misscount == scoreHR.misscount) {
                        if (board) {
                            total = total + scoreNM.score
                        } else {
                            total = total + scoreNM.misscount
                        }
                        hrMaps++;
                    }
                } else {
                    if (scoreNM) {
                        totalMaps++;
                        if (board) {
                            total = total + scoreNM.score
                        } else {
                            total = total + scoreNM.misscount
                        }
                        nmMaps++;
                    } else if (scoreHR) {
                        totalMaps++;
                        if (board) {
                            total = total + scoreHR.score
                        } else {
                            total = total + scoreHR.misscount
                        }
                        hrMaps++;
                    } else {

                    }
                }
                if (totalMaps == unique.length) processing = false;
            }
            special = "(" + nmMaps + " NM/" + hrMaps + " HR)"
            if (hrMaps == 0) special = "(" + nmMaps + " NM)"
            if (nmMaps == 0) special = "(" + hrMaps + " HR)"

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
    if (!board) {
        validUsers.sort(function (user1, user2) {
            if (user1.mapcount < user2.mapcount) return 1;
            if (user1.mapcount > user2.mapcount) return -1;
            if (user1.misscount > user2.misscount) return 1;
            if (user1.misscount < user2.misscount) return -1;
        });
    } else {
        validUsers.sort(function (user1, user2) {
            if (user1.mapcount < user2.mapcount) return 1;
            if (user1.mapcount > user2.mapcount) return -1;
            if (user1.misscount < user2.misscount) return 1;
            if (user1.misscount > user2.misscount) return -1;
        });
    }
    //console.log(validUsers)
    let measure = "misscount";
    let emoji = "<:miss:1324410432450068555>";
    let mode = "misscount";
    if(board){
        measure = "score";
        emoji = "";
        mode = "score";
    } 
    for (user in validUsers) {
        const current = validUsers[user];
        let totalString = "";
        if (current.mapcount != collection.length) {
            totalString = "** • ** **" + current.mapcount + "**/" + collection.length + " scores"
        }
        const pageNum = Number(user) + 1;
        userString = userString + ("**#" + pageNum + " [" + current.username + "](https://osu.ppy.sh/users/" + current.user_id + ") • " + current.misscount.toLocaleString() + " ** "+emoji+" " + totalString + " **" + current.speciality + "**\n")
    }
    const d = new Date();

    if(validUsers.length < 1){
        const scoreEmbed = new EmbedBuilder()
        .setAuthor({ name: "Leaderboard for: " + collectionName + "\nno misscount leader yet!", iconURL: "https://a.ppy.sh"  })
        .setDescription("no plays yet this season :(")
        .setColor(lightskyblue)
        .setFooter({ text: "season theme: sped up songs\nlast updated " + d.toUTCString() + "\ncurrent mod: none\ncurrent leaderboard: "+mode});
    return scoreEmbed;
    }
    const scoreEmbed = new EmbedBuilder()
        .setAuthor({ name: "Leaderboard for: " + collectionName + "\nCurrent "+measure+" leader: " + validUsers[0].username, iconURL: "https://a.ppy.sh/" + validUsers[0].user_id })
        .setDescription(userString)
        .setColor(lightskyblue)
        .setFooter({ text: "season theme: sped up songs\nlast updated " + d.toUTCString() + "\ncurrent mod: none\ncurrent leaderboard: "+mode});
    return scoreEmbed;
}

async function sortByMod(mod, toggle) {
    const userIDs = await osuUsers.findAll()
    let divName = currentD1Collection;
    console.log(toggle)
    const board = toggle.pp;
    if(toggle.div) divName = currentD2Collection;
    const collection = await aimLists.findAll({ where: { collection: divName } })
    const validUsers = []
    const collectionName = divName
    let userString = "";
    let special = "";
    ending = "season 0 ends <t:1747094580:R>"
    for (id in userIDs) {
        let total = 0;
        const found = await aimScores.findOne({ where: { user_id: userIDs[id].osu_id, collection: divName, mods: mod } })
        if (found) {
            const scores = await aimScores.findAll({ where: { user_id: userIDs[id].osu_id, collection: divName, mods: mod } })
            for (score in scores) {
                if (board) {
                    total = total + scores[score].score
                } else {
                    total = total + scores[score].misscount
                }
            }
            const leaderboardMap = {
                username: userIDs[id].username,
                user_id: userIDs[id].osu_id,
                mapcount: scores.length,
                misscount: total,
            }
            validUsers.push(leaderboardMap)
            //console.log(leaderboardMap)
            //console.log(userIDs[id].username+": NM: "+nmMisscount+"x"+nmAsterik+", HR: "+hrMisscount+"x"+hrAsterik)
            //console.log("maps played: "+mapsPlayed+"; "+scoresNM.length+"/"+scoresHR.length+" NM/HR plays")
        }
    }
    if (!board) {
        validUsers.sort(function (user1, user2) {
            if (user1.mapcount < user2.mapcount) return 1;
            if (user1.mapcount > user2.mapcount) return -1;
            if (user1.misscount > user2.misscount) return 1;
            if (user1.misscount < user2.misscount) return -1;
        });
    } else {
        validUsers.sort(function (user1, user2) {
            if (user1.mapcount < user2.mapcount) return 1;
            if (user1.mapcount > user2.mapcount) return -1;
            if (user1.misscount < user2.misscount) return 1;
            if (user1.misscount > user2.misscount) return -1;
        });
    }

    let measure = "misscount";
    let emoji = "<:miss:1324410432450068555>";
    let mode = "misscount";
    if(board){
        measure = "score";
        emoji = "";
        mode = "score";
    } 
    
    //console.log(validUsers)
    for (user in validUsers) {
        const current = validUsers[user];
        let totalString = "";
        if (current.mapcount != collection.length) {
            totalString = " • **" + current.mapcount + "**/" + collection.length + " **" + mod.substring(1) + "**"
        }
        const pageNum = Number(user) + 1;
        userString = userString + ("**#" + pageNum + " [" + current.username + "](https://osu.ppy.sh/users/" + current.user_id + ") • " + current.misscount.toLocaleString() + " ** "+emoji+" "+totalString + "\n")
    }
    const d = new Date();
    if(validUsers.length < 1){
        const scoreEmbed = new EmbedBuilder()
        .setAuthor({ name: "Leaderboard for: " + collectionName + "\nno misscount leader yet!", iconURL: "https://a.ppy.sh"  })
        .setDescription("no plays yet this season :(")
        .setColor(lightskyblue)
        .setFooter({ text: "season theme: sped up songs\nlast updated " + d.toUTCString() + "\ncurrent mod: "+mod+"\ncurrent leaderboard: "+mode});
    return scoreEmbed;
    }
    const scoreEmbed = new EmbedBuilder()
        .setAuthor({ name: mod.substring(1) + " Leaderboard for: " + collectionName + "\nCurrent "+measure+" leader: " + validUsers[0].username, iconURL: "https://a.ppy.sh/" + validUsers[0].user_id })
        .setDescription(userString)
        .setColor(lightskyblue)
        .setFooter({ text: "season theme: sped up songs\nlast updated " + d.toUTCString() + "\ncurrent mod: "+mod+"\ncurrent leaderboard: "+mode});
    return scoreEmbed;
}

module.exports = {
    name: Events.ClientReady, 
    async execute(client) {
        const epoch = Date.now();
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

        const toggle = new ButtonBuilder()
            .setCustomId("toggle" + epoch)
            .setLabel("score boards")
            .setStyle(ButtonStyle.Primary);

        const divToggle = new ButtonBuilder()
            .setCustomId("divToggle" + epoch)
            .setLabel("to div 2 boards")
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(hr, nm, reset);
        const row2 = new ActionRowBuilder().addComponents(toggle, divToggle);
        let ppToggle = {
            pp: false,
            div: false,
        }
        const channel = client.channels.cache.get(leaderboardChannel);
        const embed = await channel.messages.fetch(leaderboardMessage);
        const collection = await buildEmbed(ppToggle);
        await embed.edit({ content: ending, embeds: [collection], components: [row, row2] });

        //permanent buttons
        const collector = embed.createMessageComponentCollector();


        let currentMod = "none";
        collector.on("collect", async (m) => {
            if (m.customId == "hr" + epoch) {
                currentMod = "+HR";
                await m.update({
                    embeds: [await sortByMod(currentMod, ppToggle)],
                    components: [row, row2],
                })
            }
            if (m.customId == "nm" + epoch) {
                currentMod = "+NM";
                await m.update({
                    embeds: [await sortByMod(currentMod, ppToggle)],
                    components: [row, row2],
                })
            }
            if (m.customId == "reset" + epoch) {
                currentMod = "none";
                await m.update({
                    embeds: [await buildEmbed(ppToggle)],
                    components: [row, row2],
                })
            }
            if (m.customId == "toggle" + epoch) {
                if (!ppToggle.pp) {
                    ppToggle.pp = true;
                    toggle.setLabel("misscount boards")
                } else if(ppToggle.pp) {
                    ppToggle.pp = false;
                    toggle.setLabel("score boards")
                }
                if (currentMod != "none") {
                    await m.update({
                        embeds: [await sortByMod(currentMod, ppToggle)],
                        components: [row, row2],
                    })
                } else {
                    await m.update({
                        embeds: [await buildEmbed(ppToggle)],
                        components: [row, row2],
                    })
                }
            }
            if (m.customId == "divToggle" + epoch) {
                if (!ppToggle.div) {
                    ppToggle.div = true;
                    divToggle.setLabel("to div1 boards")
                } else if (ppToggle.div) {
                    ppToggle.div = false;
                    divToggle.setLabel("to div2 boards")
                }
                if (currentMod != "none") {
                    await m.update({
                        embeds: [await sortByMod(currentMod, ppToggle)],
                        components: [row, row2],
                    })
                } else {
                    await m.update({
                        embeds: [await buildEmbed(ppToggle)],
                        components: [row, row2],
                    })
                }
            }
        })
    }
}

//https://discordjs.guide/popular-topics/canvas.html#getting-started