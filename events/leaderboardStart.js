const { Events, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { aimLists, aimScores, osuUsers, currentSeasons, seasonScores } = require('../db/dbObjects.js');
const { leaderboardChannel, leaderboardMessage, currentD1Collection, currentD2Collection, end, the } = require('../config.json');
const { setDivToggle, setPPToggle } = require('../helper.js');
const { lightskyblue } = require("color-name");
let ending = end;
let theme = "none";

async function buildEmbed(ind, toggle, backward, forward) {
    const userIDs = await osuUsers.findAll()
    console.log(toggle)
    let division = 1;
    const board = toggle.pp;
    if (toggle.div === 2) { division = 1 }
    else if (toggle.div === 1) { division = 2 }
    console.log(division);
    const collection = await currentSeasons.findAll({ where: { division: 1 } })
    if (collection.length === 0) {
        const scoreEmbed = new EmbedBuilder()
            .setAuthor({ name: "Leaderboard for: no maps in season atm... \nno misscount leader yet!", iconURL: "https://a.ppy.sh" })
            .setColor(lightskyblue)
        return scoreEmbed;
        console.log("asdf");
    } else {
        const collectionName = collection[0].collection;
        const validUsers = []
        let userString = "";
        let special = "";
        for (id in userIDs) {
            let total = 0;
            let totalMaps = 0;
            let nmMaps = 0;
            let hrMaps = 0;
            let dtMaps = 0;
            const found = await seasonScores.findOne({ where: { user_id: userIDs[id].osu_id } })
            if (found) {
                let measure = "misscount";
                let sort = "asc";
                if (board) {
                    measure = "pp";
                    sort = "desc";
                }
                const scores = await seasonScores.findAll({ where: { user_id: userIDs[id].osu_id, collection: collection[0].collection }, order: [[measure, sort]] })
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
                    //ehhhhhhhhhhhhhhhhh
                    let dt = false;
                    const scoreNM = await seasonScores.findOne({ where: { user_id: userIDs[id].osu_id, map_id: unique[totalMaps].map_id, required_mods: 0 }, order: [["misscount", "asc"]] })
                    const scoreDT = await seasonScores.findOne({ where: { user_id: userIDs[id].osu_id, map_id: unique[totalMaps].map_id, required_mods: 2 }, order: [["misscount", "asc"]] })
                    const scoreHR = await seasonScores.findOne({ where: { user_id: userIDs[id].osu_id, map_id: unique[totalMaps].map_id, required_mods: 1 }, order: [["misscount", "asc"]] })
                    const scoreDTHR = await seasonScores.findOne({ where: { user_id: userIDs[id].osu_id, map_id: unique[totalMaps].map_id, required_mods: 3 }, order: [["misscount", "asc"]] })
                    if (scoreNM && scoreHR && !scoreDT) {
                        totalMaps++;
                        if (scoreHR.required_hr) {
                            total = total + scoreHR.misscount
                            hrMaps++;
                        }
                        else if (scoreNM.misscount > scoreHR.misscount) {
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
                            nmMaps++;
                        } else if (scoreDT) {
                            totalMaps++;
                            total = total + scoreDT.misscount
                            dtMaps++;
                        }
                        else if (scoreHR) {
                            totalMaps++;
                            total = total + scoreHR.misscount
                            hrMaps++;
                        } else if (scoreDTHR) {
                            totalMaps++;
                            total = total + scoreDTHR.misscount
                            dtMaps++;
                        }
                    }
                    //console.log(totalMaps + " " + unique.length)
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
                if (user1.misscount < user2.misscount) return 1;
                if (user1.misscount > user2.misscount) return -1;
            });
        }
        console.log(validUsers)
        let measure = "misscount";
        let emoji = " <:miss:1324410432450068555>";
        let mode = "misscount";
        if (board) {
            measure = "pp";
            emoji = "pp";
            mode = "pp";
        }
        //genuinely dont know how to solve this we might need a rewrite
        let offset = Math.trunc(validUsers.length / 25)
        let index = Number(ind);
        if (index > 0) index = index * 25;
        if (offset == ind) {
            forward.setDisabled(true);
            backward.setDisabled(false);
        }
        if (index == 0) {
            backward.setDisabled(true);
            forward.setDisabled(false);
        }
        if (index == 0 && offset == 0) {
            backward.setDisabled(true);
            forward.setDisabled(true);
        }
        for (let i = index; i < 25 + index; i++) {
            if (i < validUsers.length) {
                const current = validUsers[i];
                let totalString = "";
                if (current.mapcount != collection.length) {
                    totalString = "** • ** **" + current.mapcount + "**/" + collection.length + " scores"
                }
                const pageNum = Number(i) + 1;
                userString = userString + ("**#" + pageNum + " [" + current.username + "](https://osu.ppy.sh/users/" + current.user_id + ") • " + current.misscount.toLocaleString() + "**" + emoji + " " + totalString + " **" + current.speciality + "**\n")
            }
        }
        //console.log(userString)
        const d = new Date();

        if (validUsers.length < 1) {
            const scoreEmbed = new EmbedBuilder()
                .setAuthor({ name: "Leaderboard for: " + collectionName + "\nno misscount leader yet!", iconURL: "https://a.ppy.sh" })
                .setDescription("no plays yet this season :(")
                .setColor(lightskyblue)
                .setFooter({ text: "season theme: " + theme + "\nlast updated " + d.toUTCString() + "\ncurrent mod: none\ncurrent leaderboard: " + mode });
            return scoreEmbed;
        }
        const scoreEmbed = new EmbedBuilder()
            .setAuthor({ name: "Leaderboard for: " + collectionName + "\nCurrent " + measure + " leader: " + validUsers[0].username, iconURL: "https://a.ppy.sh/" + validUsers[0].user_id })
            .setDescription(userString)
            .setColor(lightskyblue)
            .setFooter({ text: "season theme: " + theme + "\nlast updated " + d.toUTCString() + "\ncurrent mod: none\ncurrent leaderboard: " + mode });
        return scoreEmbed;
    }
}

async function sortByMod(required_mods, toggle, ind, backward, forward) {
    const userIDs = await osuUsers.findAll()
    console.log(toggle)
    const board = toggle.pp;
    const validUsers = [];
    if (toggle.div) divName = currentD2Collection;
    const collection = await currentSeasons.findAll({ where: { division: 1 } })
    const collectionName = collection[0].collection
    console.log(collection[0].collection);
    let userString = "";
    let special = "";
    ending = "season 2 ends <t:1753142400:R>"
    for (id in userIDs) {
        let total = 0;
        const found = await seasonScores.findOne({ where: { user_id: userIDs[id].osu_id, collection: collectionName, required_mods: required_mods } })
        if (found) {
            let measure = "misscount";
            let sort = "asc";
            if (board) {
                measure = "pp";
                sort = "desc";
            }
            const scores = await seasonScores.findAll({ where: { user_id: userIDs[id].osu_id, collection: divName, required_mods: required_mods }, order: [[measure, sort]] })
            const mapIDs = []
            const unique = []
            //???
            for (score in scores) {
                if (!mapIDs.includes(scores[score].map_id)) {
                    mapIDs.push(scores[score].map_id)
                    unique.push(scores[score])
                }
            }
            for (score in unique) {
                if (board) {
                    total = total + unique[score].pp
                } else {
                    total = total + unique[score].misscount
                }
            }
            const leaderboardMap = {
                username: userIDs[id].username,
                user_id: userIDs[id].osu_id,
                mapcount: unique.length,
                misscount: total,
            }
            validUsers.push(leaderboardMap)
            console.log(leaderboardMap)
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
            if (user1.misscount < user2.misscount) return 1;
            if (user1.misscount > user2.misscount) return -1;
        });
    }

    let measure = "misscount";
    let emoji = "<:miss:1324410432450068555>";
    let mode = "misscount";
    if (board) {
        measure = "pp";
        emoji = "pp";
        mode = "pp";
    }
    let offset = Math.trunc(validUsers.length / 25)
    let index = Number(ind);
    if (index > 0) index = index * 25;
    if (offset == ind) {
        forward.setDisabled(true);
        backward.setDisabled(false);
    }
    if (index == 0) {
        backward.setDisabled(true);
        forward.setDisabled(false);
    }
    if (index == 0 && offset == 0) {
        backward.setDisabled(true);
        forward.setDisabled(true);
    }
    console.log(validUsers)
    let mod = '';
    if (required_mods === 0) mod = 'nm';
    if (required_mods === 1) mod = 'hr';
    if (required_mods === 2) mod = 'dt';
    for (let i = index; i < 25 + index; i++) {
        if (i < validUsers.length) {
            const current = validUsers[i];
            let totalString = "";
            if (current.mapcount != collection.length) {
                totalString = " • **" + current.mapcount + "**/" + collection.length + " **" + mod.substring(1) + "**"
            }
            const pageNum = Number(i) + 1;
            userString = userString + ("**#" + pageNum + " [" + current.username + "](https://osu.ppy.sh/users/" + current.user_id + ") • " + current.misscount.toLocaleString() + "**" + emoji + " " + totalString + "\n")
        }
    }
    const d = new Date();
    if (validUsers.length < 1) {
        const scoreEmbed = new EmbedBuilder()
            .setAuthor({ name: "Leaderboard for: " + collectionName + "\nno misscount leader yet!", iconURL: "https://a.ppy.sh" })
            .setDescription("no plays yet this season :(")
            .setColor(lightskyblue)
            .setFooter({ text: "season theme: " + theme + "\nlast updated " + d.toUTCString() + "\ncurrent mod: " + mod + "\ncurrent leaderboard: " + mode });
        return scoreEmbed;
    }
    const scoreEmbed = new EmbedBuilder()
        .setAuthor({ name: mod.substring(1) + " Leaderboard for: " + collectionName + "\nCurrent " + measure + " leader: " + validUsers[0].username, iconURL: "https://a.ppy.sh/" + validUsers[0].user_id })
        .setDescription(userString)
        .setColor(lightskyblue)
        .setFooter({ text: "season theme: " + theme + "\nlast updated " + d.toUTCString() + "\ncurrent mod: " + mod + "\ncurrent leaderboard: " + mode });
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

        const dt = new ButtonBuilder()
            .setCustomId("dt" + epoch)
            .setLabel("dt only")
            .setDisabled(true)
            .setStyle(ButtonStyle.Secondary);

        const toggle = new ButtonBuilder()
            .setCustomId("toggle" + epoch)
            .setLabel("pp boards")
            .setStyle(ButtonStyle.Primary);

        const divToggle = new ButtonBuilder()
            .setCustomId("divToggle" + epoch)
            .setLabel("to div 2 boards")
            .setStyle(ButtonStyle.Primary);

        const forward = new ButtonBuilder()
            .setCustomId("forward" + epoch)
            //.setDisabled(true)
            .setLabel("⟶")
            .setStyle(ButtonStyle.Primary);

        const backward = new ButtonBuilder()
            .setCustomId("back" + epoch)
            //.setDisabled(true)
            .setLabel("⟵")
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(hr, nm, dt, reset);
        const row2 = new ActionRowBuilder().addComponents(toggle, divToggle);
        const row3 = new ActionRowBuilder().addComponents(backward, forward);
        let ppToggle = {
            pp: false,
            div: 1,
        }
        let ind = 0;
        const channel = client.channels.cache.get(leaderboardChannel);
        const embed = await channel.messages.fetch(leaderboardMessage);
        const collection = await buildEmbed(ind, ppToggle, backward, forward);
        console.log("poop" + collection)
        await embed.edit({ content: ending, embeds: [collection], components: [row3, row, row2] });

        //permanent buttons
        const collector = embed.createMessageComponentCollector();

        let currentMod = 0;
        let currentModDisplay = '';
        collector.on("collect", async (m) => {
            if (m.customId == "forward" + epoch) {
                ind++;
                if (currentMod == 0) {
                    await m.update({
                        embeds: [await buildEmbed(ind, ppToggle, backward, forward)],
                        components: [row3, row, row2],
                    })
                } else {
                    await m.update({
                        embeds: [await sortByMod(currentMod, ppToggle, ind, backward, forward)],
                        components: [row3, row, row2],
                    })
                }
            }
            if (m.customId == "back" + epoch) {
                ind--;
                if (currentMod == 0) {
                    await m.update({
                        embeds: [await buildEmbed(ind, ppToggle, backward, forward)],
                        components: [row3, row, row2],
                    })
                } else {
                    await m.update({
                        embeds: [await sortByMod(currentMod, ppToggle, ind, backward, forward)],
                        components: [row3, row, row2],
                    })
                }
            }
            if (m.customId == "hr" + epoch) {
                ind = 0;
                currentMod = 1;
                currentModDisplay = 'hr'
                await m.update({
                    embeds: [await sortByMod(currentMod, ppToggle, ind, backward, forward)],
                    components: [row3, row, row2],
                })
            }
            if (m.customId == "nm" + epoch) {
                ind = 0;
                currentMod = 0;
                currentModDisplay = 'nm'
                await m.update({
                    embeds: [await sortByMod(currentMod, ppToggle, ind, backward, forward)],
                    components: [row3, row, row2],
                })
            }
            if (m.customId == "dt" + epoch) {
                ind = 0;
                currentMod = 2;
                currentModDisplay = 'dt'
                await m.update({
                    embeds: [await sortByMod(currentMod, ppToggle, ind, backward, forward)],
                    components: [row3, row, row2],
                })
            }
            if (m.customId == "reset" + epoch) {
                ind = 0;
                currentMod = 0;
                currentModDisplay = 'none';
                await m.update({
                    embeds: [await buildEmbed(ind, ppToggle, backward, forward)],
                    components: [row3, row, row2],
                })
            }
            if (m.customId == "toggle" + epoch) {
                ind = 0;
                if (!ppToggle.pp) {
                    ppToggle.pp = true;
                    setPPToggle(true);
                    toggle.setLabel("misscount boards")
                } else if (ppToggle.pp) {
                    ppToggle.pp = false;
                    setPPToggle(false);
                    toggle.setLabel("pp boards")
                }
                if (currentMod != 0) {
                    await m.update({
                        embeds: [await sortByMod(currentMod, ppToggle, ind, backward, forward)],
                        components: [row3, row, row2],
                    })
                } else {
                    await m.update({
                        embeds: [await buildEmbed(ind, ppToggle, backward, forward)],
                        components: [row3, row, row2],
                    })
                }
            }
            if (m.customId == "divToggle" + epoch) {
                ind = 0;
                if (!ppToggle.div) {
                    ppToggle.div = true;
                    setDivToggle(true);
                    divToggle.setLabel("to div1 boards")
                } else if (ppToggle.div) {
                    ppToggle.div = false;
                    setDivToggle(false);
                    divToggle.setLabel("to div2 boards")
                }
                if (currentMod != 0) {
                    await m.update({
                        embeds: [await sortByMod(currentMod, ppToggle, ind, backward, forward)],
                        components: [row3, row, row2],
                    })
                } else {
                    await m.update({
                        embeds: [await buildEmbed(ind, ppToggle, backward, forward)],
                        components: [row3, row, row2],
                    })
                }
            }
        })
    }
}

//https://discordjs.guide/popular-topics/canvas.html#getting-started