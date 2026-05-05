const { Events, EmbedBuilder } = require('discord.js');
const { aimLists, aimScores, osuUsers, currentSeasons, seasonScores } = require('../db/dbObjects.js');
const { currentD1Collection, currentD2Collection } = require('../config.json');
const { lightskyblue } = require("color-name");
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const regex = /^\.misscount/gm;

async function misscountByDT(uID, mod, d) {
    let divName = d;
    let total = 0;
    let totalMaps = 0;
    const found = await aimScores.findOne({ where: { user_id: uID, collection: divName, mods: mod, required_dt: true } })
    const unique = []
    if (found) {
        const scores = await aimScores.findAll({ where: { user_id: uID, collection: divName, mods: mod, required_dt: true }, order: [["map_id", "DESC"]] })
        const mapIDs = []
        //???
        for (score in scores) {
            if (!mapIDs.includes(scores[score].map_id)) {
                mapIDs.push(scores[score].map_id)
                unique.push(scores[score])
                //console.log(scores[score].map_id)
            }
        }
        let processing = true
        while (processing) {
            const singleScore = await aimScores.findOne({ where: { user_id: uID, map_id: unique[totalMaps].map_id, mods: mod, required_dt: true }, order: [["misscount", "ASC"]] })
            if (singleScore) {
                totalMaps++;
                total = total + singleScore.misscount
            }
            if (totalMaps == unique.length) processing = false;
        }
    }
    return {
        scores: unique,
        maps: totalMaps,
        misscount: total
    }
}

async function misscountByHR(uID, mod, d) {
    let divName = d;
    let total = 0;
    let totalMaps = 0;
    const found = await aimScores.findOne({ where: { user_id: uID, collection: divName, mods: mod, required_hr: true } })
    const unique = []
    if (found) {
        const scores = await aimScores.findAll({ where: { user_id: uID, collection: divName, mods: mod, required_hr: true }, order: [["map_id", "DESC"]] })
        const mapIDs = []
        //???
        for (score in scores) {
            if (!mapIDs.includes(scores[score].map_id)) {
                mapIDs.push(scores[score].map_id)
                unique.push(scores[score])
                //console.log(scores[score].map_id)
            }
        }
        let processing = true
        while (processing) {
            const singleScore = await aimScores.findOne({ where: { user_id: uID, map_id: unique[totalMaps].map_id, mods: mod, required_hr: true }, order: [["misscount", "ASC"]] })
            if (singleScore) {
                totalMaps++;
                total = total + singleScore.misscount
            }
            if (totalMaps == unique.length) processing = false;
        }
    }
    return {
        scores: unique,
        maps: totalMaps,
        misscount: total
    }
}

async function misscountByMod(uID, mod, d) {
    let divName = d;
    let total = 0;
    let totalMaps = 0;
    const found = await seasonScores.findOne({ where: { user_id: uID, collection: divName, required_mods: mod } })
    const unique = []
    if (found) {
        const scores = await seasonScores.findAll({ where: { user_id: uID, collection: divName, required_mods: mod }, order: [["map_id", "DESC"]] })
        const mapIDs = []
        //???
        for (score in scores) {
            if (!mapIDs.includes(scores[score].map_id)) {
                mapIDs.push(scores[score].map_id)
                unique.push(scores[score])
                console.log(scores[score].map_id)
            }
        }
        let processing = true
        while (processing) {
            const singleScore = await seasonScores.findOne({ where: { user_id: uID, map_id: unique[totalMaps].map_id, required_mods: mod }, order: [["misscount", "ASC"]] })
            if (singleScore) {
                totalMaps++;
                total = total + singleScore.misscount
            }
            console.log(totalMaps)
            if (totalMaps == unique.length) processing = false;
        }
    }
    return {
        scores: unique,
        maps: totalMaps,
        misscount: total
    }
}

async function buildEmbedByMod(data, mod, m, uID, ma) {
    const maps = m;
    const allMaps = ma;
    let misscount = 0;
    let bool = false;
    let string = "";
    console.log(mod);
    let leftovers = "no scores found"
    if (data.maps == maps.length) {
        string = "\n";
        const scores = data.scores
        for (score in scores) {
            misscount = misscount + scores[score].misscount;
            if (score != data.maps - 1) {
                string = string + "[" + scores[score].misscount + "]" + "(https://osu.ppy.sh/b/" + scores[score].map_id + ")  |  "
            } else {
                string = string + "[" + scores[score].misscount + "]" + "(https://osu.ppy.sh/b/" + scores[score].map_id + ")"
            }
        }
        bool = true
        string = " **" + string + "**"
        leftovers = "";
    } else if (data.maps < maps.length) {
        for (let i = 0; i < maps.length; i++) {
            let pageNum = Number(i) + 1
            const current = await seasonScores.findOne({
                where: {
                    map_id: maps[i].map_id, user_id: uID, required_mods: mod
                },
                order: [[
                    "misscount", "ASC"
                ]]
            })
            console.log(current);
            if (current) {
                if (leftovers === "no scores found") {
                    leftovers = ""
                }
                leftovers = leftovers + "[" + current.misscount + "]" + "(https://osu.ppy.sh/b/" + maps[i].map_id + ")  |  "
                misscount = misscount + current.misscount
                
            } else {
                const map = await currentSeasons.findOne({ where: { map_id: maps[i].map_id } })
                //MEHHH
                let processing = true;
                while (processing) {
                    for (j in allMaps) {
                        if (allMaps[j].map_id == maps[i].map_id) {
                            pageNum = Number(j) + 1;
                            processing = false;
                        }
                    }
                }
                if (i < maps.length - 1) {
                    string = string + "[" + pageNum + "](https://osu.ppy.sh/b/" + maps[i].map_id + "), "
                } else if (i == maps.length - 1) {
                    string = string + "[" + pageNum + "](https://osu.ppy.sh/b/" + maps[i].map_id + ")"
                }
            }
            //console.log("missing "+i)
        }
    }
    return {
        misscount: misscount,
        bool: bool,
        string: string,
        leftovers: leftovers
    }
}

async function calcTotal(uID, c) {
    let divName = c;
    let total = 0;
    let totalMaps = 0;

    let nmTotal = 0;
    let hrTotal = 0;
    let dtTotal = 0;
    let dthrTotal = 0;

    let nmMaps = 0;
    let hrMaps = 0;
    let dtMaps = 0;
    let dthrMaps = 0;

    const found = await seasonScores.findOne({ where: { user_id: uID, collection: divName } })
    if (found) {
        const scores = await seasonScores.findAll({ where: { user_id: uID, collection: divName } })
        const mapIDs = []
        const unique = []
        //???
        for (score in scores) {
            if (!mapIDs.includes(scores[score].map_id)) {
                mapIDs.push(scores[score].map_id)
                unique.push(scores[score])
            }
        }
        let processing = true
        while (processing) {
            //ehhhhhhhhhhhhhhhhh
            let dt = false;
            const scoreNM = await seasonScores.findOne({ where: { user_id: uID, map_id: unique[totalMaps].map_id, required_mods: 0 }, order: [["misscount", "asc"]] })
            const scoreDT = await seasonScores.findOne({ where: { user_id: uID, map_id: unique[totalMaps].map_id, required_mods: 2 }, order: [["misscount", "asc"]] })
            const scoreHR = await seasonScores.findOne({ where: { user_id: uID, map_id: unique[totalMaps].map_id, required_mods: 1 }, order: [["misscount", "asc"]] })
            const scoreDTHR = await seasonScores.findOne({ where: { user_id: uID, map_id: unique[totalMaps].map_id, required_mods: 3 }, order: [["misscount", "asc"]] })
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
        return {
            total: total,
            hrMaps: hrMaps,
            nmMaps: nmMaps,
            dtMaps: dtMaps,
            dthrMaps: dthrMaps,
            mapcount: totalMaps,
        }
    }
    return {
        total: -1,
        hrMaps: hrMaps,
        nmMaps: nmMaps,
        dtMaps: dtMaps,
        dthrMaps: dthrMaps,
        mapcount: 0
    }
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
        if (regex.test(msg.substring(0, 11))) {
            let collectionStr = 0
            let username = "";
            if (msg.indexOf("u=") == -1) {
                const self = await osuUsers.findOne({ where: { user_id: message.author.id } });
                if (self) {
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
            let collection;
            let division = 0;
            if (msg.indexOf("c=") > 0) {
                collectionName = msg.substring(msg.indexOf("c=") + 2, collectionStr);
            } else {
                collection = await currentSeasons.findOne({ where: { division: 1 } });
                console.log(collection.collection);
                collectionName = collection.collection;
                division = 1;
            }
            if (msg.substring(10, 11) == "2") {
                collection = await currentSeasons.findOne({ where: { division: 2 } });
                collectionName = collection.collection;
                division = 2;
            }
            if (msg === ".misscount") {
                const self = await osuUsers.findOne({ where: { user_id: message.author.id } });
                if (self) {
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
                //console.log(dthr)

                const allMaps = await currentSeasons.findAll({ where: { collection: collectionName }, order: [["map_id", "desc"]] })
                const maps = await currentSeasons.findAll({ where: { collection: collectionName, required_mods: 0 }, order: [["map_id", "desc"]] })
                const hrMaps = await currentSeasons.findAll({ where: { collection: collectionName, required_mods: 1 }, order: [["map_id", "desc"]] })
                const dtMaps = await currentSeasons.findAll({ where: { collection: collectionName, required_mods: 2 }, order: [["map_id", "desc"]] })
                const dthrMaps = await currentSeasons.findAll({ where: { collection: collectionName, required_mods: 3 }, order: [["map_id", "desc"]] })

                const nm = await misscountByMod(check.osu_id, 0, collectionName);
                const hr = await misscountByMod(check.osu_id, 1, collectionName)
                const dthr = await misscountByMod(check.osu_id, 3, collectionName);
                const dt = await misscountByMod(check.osu_id, 2, collectionName);

                const hrEmbed = await buildEmbedByMod(hr, 1, hrMaps, check.osu_id, allMaps)
                const nmEmbed = await buildEmbedByMod(nm, 0, maps, check.osu_id, allMaps);
                const dtEmbed = await buildEmbedByMod(dt, 2, dtMaps, check.osu_id, allMaps);
                const dthrEmbed = await buildEmbedByMod(dthr, 3, dthrMaps, check.osu_id, allMaps);
                const total = await calcTotal(check.osu_id, collectionName)
                //console.log(dthrEmbed)
                //console.log(nm)
                let hrString = hrEmbed.string;
                let nmString = nmEmbed.string;
                let dtString = dtEmbed.string;
                let dthrString = dthrEmbed.string;
                console.log(dthrString)
                if (!hrEmbed.bool)
                    hrString = "* \n**" + hrEmbed.leftovers + "** \nmissing hr plays on map(s): \n**" + hrString + "**"
                if (!nmEmbed.bool)
                    nmString = "* \n**" + nmEmbed.leftovers + "** \nmissing nm plays on map(s): \n**" + nmString + "**"
                if (!dtEmbed.bool)
                    dtString = "* \n**" + dtEmbed.leftovers + "** \nmissing dt plays on map(s): \n**" + dtString + "**"
                if (!dthrEmbed.bool)
                    dthrString = "* \n**" + dthrEmbed.leftovers + "** \nmissing dt plays on map(s): \n**" + dthrString + "**"

                if (hrEmbed.leftovers === "no scores found") {
                    hrString = "\nno scores found"
                    hr.misscount = -1
                }
                if (nmEmbed.leftovers === "no scores found") {
                    nmString = "\nno scores found"
                    nm.misscount = -1
                }
                if (dtEmbed.leftovers === "no scores found") {
                    dtString = "\nno scores found"
                    dt.misscount = -1
                }
                if (dthrEmbed.leftovers === "no scores found") {
                    dthrString = "\nno scores found"
                    dthr.misscount = -1
                }
                let asterik = "";
                let description = "hr misscount: **" + hr.misscount + "**" + hrString
                    + "\n\nnm misscount: **" + nm.misscount + "**" + nmString + "\n\n total misscount: **" + total.total + asterik + " (" + total.nmMaps + " NM/" + total.hrMaps + " HR)**"
                if (dtMaps.length > 0) {
                    description = "hr misscount: **" + hr.misscount + "**" + hrString
                        + "\n\nnm misscount: **" + nm.misscount + "**" + nmString
                        + "\n\ndt misscount: **" + dt.misscount + "**" + dtString
                        + "\n\n total misscount: **" + total.total + asterik + " (" + total.nmMaps + " NM/" + total.hrMaps + " HR/" + total.dtMaps + " DT)**"
                }
                if (dthrMaps.length > 0) {
                    description = "hr misscount: **" + hr.misscount + "**" + hrString
                        + "\n\nnm misscount: **" + nm.misscount + "**" + nmString
                        + "\n\ndt misscount: **" + dt.misscount + "**" + dtString
                        + "\n\ndthr misscount: **" + dthr.misscount + "**" + dthrString
                        + "\n\n total misscount: **" + total.total + asterik + " (" + total.nmMaps + " NM/" + total.hrMaps + " HR/" + total.dtMaps + " DT/" + total.dthrMaps + " DTHR)**"
                }
                //console.log("?")
                if (total.mapcount < maps.length) asterik = "*"
                const misscountEmbed = new EmbedBuilder()
                    .setAuthor({
                        name: "misscount totals for " + check.username + "\ncollection: " + collectionName,
                        iconURL: "https://a.ppy.sh/" + check.osu_id
                    })
                    .setDescription(description)
                    .setColor(lightskyblue)
                    .setFooter({ text: "great job!" });
                return await message.channel.send({ embeds: [misscountEmbed] })
            } else {
                return message.channel.send("user or collection not found, use /osuset")
            }
        }
    }
}

//https://discordjs.guide/popular-topics/canvas.html#getting-started