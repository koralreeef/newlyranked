const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { aimLists, aimScores, osuUsers } = require('../../db/dbObjects.js');
const { currentD1Collection, currentD2Collection } = require('../../config.json');
const { lightskyblue } = require("color-name");
const Sequelize = require('sequelize');
const Op = Sequelize.Op;


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

async function misscountByMod(uID, mod, d) {
    let divName = d;
    let total = 0;
    let totalMaps = 0;
    const found = await aimScores.findOne({ where: { user_id: uID, collection: divName, mods: mod, required_dt: false } })
    const unique = []
    if (found) {
        const scores = await aimScores.findAll({ where: { user_id: uID, collection: divName, mods: mod, required_dt: false }, order: [["map_id", "DESC"]] })
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
            const singleScore = await aimScores.findOne({ where: { user_id: uID, map_id: unique[totalMaps].map_id, mods: mod, required_dt: false }, order: [["misscount", "ASC"]] })
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

async function buildEmbedByMod(data, mod, m, uID, requiredDT) {
    const maps = m;
    let misscount = 0;
    let bool = false;
    let string = "";
    let leftovers = "no scores found";
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
            const current = await aimScores.findOne({
                where: {
                    map_id: maps[i].map_id, user_id: uID, mods: mod, required_dt: requiredDT
                },
                order: [[
                    "misscount", "ASC"
                ]]
            })
            if (current) {
                console.log(current.mods)
                if (leftovers === "no scores found") {
                    leftovers = ""
                }
                if (!requiredDT && !current.required_dt || requiredDT && current.required_dt) {
                    leftovers = leftovers + "[" + current.misscount + "]" + "(https://osu.ppy.sh/b/" + maps[i].map_id + ")  |  "
                    misscount = misscount + current.misscount
                }
                //console.log("hi "+i)
            } else {
                const map = await aimLists.findOne({ where: { map_id: maps[i].map_id } })
                console.log(requiredDT + " , " + map.required_dt + ", ")
                if (requiredDT) {
                    if (i != maps.length - 1 && map.required_dt) {
                        string = string + "[" + pageNum + "](https://osu.ppy.sh/b/" + maps[i].map_id + "), "
                    } else if (i == maps.length - 1 && map.required_dt) {
                        string = string + "[" + pageNum + "](https://osu.ppy.sh/b/" + maps[i].map_id + ")"
                    }
                } else {
                    if (i != maps.length - 1 && !map.required_dt) {
                        string = string + "[" + pageNum + "](https://osu.ppy.sh/b/" + maps[i].map_id + "), "
                    } else if (!map.required_dt) {
                        string = string + "[" + pageNum + "](https://osu.ppy.sh/b/" + maps[i].map_id + ")"
                    }
                }
                //console.log("missing "+i)
            }
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
    let nmMaps = 0;
    let hrMaps = 0;
    let dtMaps = 0;
    const found = await aimScores.findOne({ where: { user_id: uID, collection: divName } })
    if (found) {
        const scores = await aimScores.findAll({ where: { user_id: uID, collection: divName } })
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
            const scoreNM = await aimScores.findOne({ where: { user_id: uID, map_id: unique[totalMaps].map_id, mods: "+NM" }, order: [["misscount", "ASC"]] })
            const scoreHR = await aimScores.findOne({ where: { user_id: uID, map_id: unique[totalMaps].map_id, mods: "+HR" }, order: [["misscount", "ASC"]] })
            const scoreDT = await aimScores.findOne({ where: { user_id: uID, map_id: unique[totalMaps].map_id, mods: "+DT" }, order: [["misscount", "ASC"]] })
            if (scoreNM && scoreHR) {
                totalMaps++;
                if (scoreNM.misscount > scoreHR.misscount) {
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
                    nmTotal = nmTotal + scoreNM.misscount
                    nmMaps++;
                } else if (scoreHR) {
                    totalMaps++;
                    total = total + scoreHR.misscount
                    hrTotal = hrTotal + scoreHR.misscount
                    hrMaps++;
                } else if (scoreDT) {
                    totalMaps++;
                    total = total + scoreDT.misscount
                    dtTotal = dtTotal + scoreDT.misscount
                    dtMaps++;
                }
            }
            if (totalMaps == unique.length) processing = false;
        }
        return {
            total: total,
            hrMaps: hrMaps,
            nmMaps: nmMaps,
            dtMaps: dtMaps,
            mapcount: totalMaps,
        }
    }
    return {
        total: -1,
        hrMaps: hrMaps,
        nmMaps: nmMaps,
        dtMaps: dtMaps,
        mapcount: 0
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('misscount')
        .setDescription('check misscounts for a collection')
        .addStringOption(option =>
            option.setName('collection')
                .setAutocomplete(true)
                .setDescription('defaults to current season'))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('highlights a users scores on the lb; defaults to you'))
        .addBooleanOption(option =>
            option.setName('private')
                .setDescription('view privately? (false for no)')),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        const collections = await aimLists.findAll();
        const unique = [];
        for (entry in collections) {
            if (!unique.includes(collections[entry].collection)) unique.push(collections[entry].collection)
        }
        const filtered = unique
            .filter((choice) => choice.startsWith(focusedValue))
            .slice(0, 5);
        await interaction.respond(
            filtered.map((choice) => ({ name: choice, value: choice })),
        );
    },
    async execute(interaction) {
        const ephemeral = interaction.options.getBoolean("private") ?? false;
        const collectionName = interaction.options.getString("collection") ?? currentD1Collection;
        //CAN WE GET SERIOUS
        const inputUser = interaction.options.getUser("user") ?? interaction.user
        console.log(inputUser.id)
        const self = await osuUsers.findOne({ where: { user_id: inputUser.id } });
        if (!self) return await interaction.reply({ content: "use /osuset before using this command", ephemeral: true })
        const username = self.username
        await interaction.deferReply({ ephemeral: ephemeral })
        let aimList = await aimLists.findAll({
            where: { collection: collectionName },
            order: [
                ["map_id", "DESC"],
            ]
        });

        if (aimList.length < 1) {
            return interaction.followUp("couldnt find collection")
        }
        console.log("asdasd " + collectionName)

        const check = await osuUsers.findOne({
            where: {
                username: {
                    [Op.like]: username.toLowerCase()
                }
            },
        });
        if (check) {
            const hr = await misscountByMod(check.osu_id, "+HR", collectionName);
            const nm = await misscountByMod(check.osu_id, "+NM", collectionName);
            const dt = await misscountByDT(check.osu_id, "+DT", collectionName);
            const maps = await aimLists.findAll({ where: { collection: collectionName, required_dt: false }, order: [["map_id", "desc"]] })
            const dtMaps = await aimLists.findAll({ where: { collection: collectionName, required_dt: true }, order: [["map_id", "desc"]] })
            for (map in maps) {
                console.log(maps[map].title)
            }
            const hrEmbed = await buildEmbedByMod(hr, "+HR", maps, check.osu_id, false);
            const nmEmbed = await buildEmbedByMod(nm, "+NM", maps, check.osu_id, false);
            const dtEmbed = await buildEmbedByMod(dt, "+DT", dtMaps, check.osu_id, true);
            console.log("make")
            const total = await calcTotal(check.osu_id, collectionName)
            //console.log(hrEmbed)
            //console.log(nmEmbed)
            //console.log(dtEmbed)
            let hrString = hrEmbed.string;
            let nmString = nmEmbed.string;
            let dtString = dtEmbed.string;
            if (!hrEmbed.bool)
                hrString = "* \n**" + hrEmbed.leftovers + "** \nmissing hr plays on map(s): \n**" + hrString + "**"
            if (!nmEmbed.bool)
                nmString = "* \n**" + nmEmbed.leftovers + "** \nmissing nm plays on map(s): \n**" + nmString + "**"
            if (!dtEmbed.bool)
                dtString = "* \n**" + dtEmbed.leftovers + "** \nmissing dt plays on map(s): \n**" + dtString + "**"
            if (hrEmbed.leftovers === "no scores found") {
                hrString = "\nno scores found"
                hr.misscount = -1
            }
            if (nmEmbed.leftovers === "no scores found") {
                nmString = "\nno scores found"
                nm.misscount = -1
            }
            if (dtEmbed.leftovers === "no scores found") {
                dtString = ""
                dt.misscount = -1
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
            if (total.mapcount < maps.length) asterik = "*"
            const misscountEmbed = new EmbedBuilder()
                .setAuthor({
                    name: "misscount totals for " + check.username + "\ncollection: " + collectionName,
                    iconURL: "https://a.ppy.sh/" + check.osu_id
                })
                .setDescription(description)
                .setColor(lightskyblue)
                .setFooter({ text: "great job!" });
            return await interaction.followUp({ embeds: [misscountEmbed] })
        } else {
            return await interaction.followUp("user or collection not found, use /osuset")
        }

    }
}

//https://discordjs.guide/popular-topics/canvas.html#getting-started