const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { Client, calcModStat } = require('osu-web.js');
const { clientIDv2, clientSecret, AccessToken, currentD1Collection, currentD2Collection, nmRole, hrRole, hundoRole } = require('../../config.json');
const { lightskyblue, gold, white } = require('color-name');
const { osuUsers, aimLists, aimScores } = require('../../db/dbObjects.js');
const { tools, v2, auth } = require('osu-api-extended')
const { setBeatmapID, getAccessToken } = require('../../helper.js');
const { hr, ez } = calcModStat;
const axios = require('axios');
const rosu = require("rosu-pp-js");
const fs = require("fs");

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function misscount(osu_id, divName) {
    let total = 0;
    let totalMaps = 0;
    let nmMaps = 0;
    let hrMaps = 0;
    const scores = await aimScores.findAll({ where: { user_id: osu_id, collection: divName } })
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
        const scoreNM = await aimScores.findOne({ where: { user_id: osu_id, map_id: unique[totalMaps].map_id, mods: "+NM" } })
        const scoreHR = await aimScores.findOne({ where: { user_id: osu_id, map_id: unique[totalMaps].map_id, mods: "+HR" } })
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
                nmMaps++;
            } else if (scoreHR) {
                totalMaps++;
                total = total + scoreHR.misscount
                hrMaps++;
            } else {

            }
        }
        if (totalMaps == unique.length) processing = false;
    }
    return total
}

//APPLY 60S COOLDOWN LATER
module.exports = {
    cooldown: 60,
    data: new SlashCommandBuilder()
        .setName('submit')
        .setDescription('submits all passed plays within the last 24h')
        .addBooleanOption(option =>
            option.setName('private')
                .setDescription('submit privately? (false for no)')
                .setRequired(true)),

    async execute(interaction) {
        const ephemeral = interaction.options.getBoolean("private");
        const user = await osuUsers.findOne({ where: { user_id: interaction.user.id } })
        if (!user) return await interaction.reply({ content: 'please use /osuset before using this command', ephemeral: true });
        //show misscount change (if any), show mapcount change (if any)
        await interaction.deferReply({ ephemeral: ephemeral });
        const epoch = Date.now();

        const api = new Client(await getAccessToken());
        let scores;
        try {
            scores = await api.users.getUserScores(user.osu_id, 'recent', {
                query: {
                    mode: 'osu',
                    limit: 100,
                    include_fails: false
                }
            });
        } catch (err) {
            console.log(err)
            return await interaction.followUp("no score found or you didnt use /osuset");
        }
        const dir = fs.mkdirSync("./maps" + epoch);
        await sleep(1_000)

        const balls = []
        //console.log(scores)
        if (scores.length < 1) return await interaction.followUp("no scores found");
        let mapCount = 0;
        let newD1Misscount = 0;
        let newD2Misscount = 0;
        let oldD1Misscount = await misscount(user.osu_id, currentD1Collection);
        let oldD2Misscount = await misscount(user.osu_id, currentD2Collection);
        const errorArray = []
        for (score in scores) {
            const unfiltered = await aimLists.findAll()
            const unique = [];
            for (entry in unfiltered) {
                if (!unique.includes(unfiltered[entry].creatorID)) unique.push(unfiltered[entry].creatorID)
            }
            const currentMapID = scores[score].beatmap.id
            const validMap = await aimLists.findOne({ where: { map_id: currentMapID } })
            if (!validMap) {
                let beatmap;
                try {
                    beatmap = await api.beatmaps.getBeatmap(currentMapID);
                } catch (err) {
                    console.log(err)
                }
                console.log(beatmap.beatmapset.user_id+" "+unique[11])
                if (unique.includes(String(beatmap.beatmapset.user_id))) {
                    let mapper = "";
                    try {
                        mapper = await api.users.getUser(beatmap.beatmapset.user_id);
                    } catch (err) {
                        console.log(err)
                    }
                    await aimLists.create({
                        map_id: beatmap.id,
                        set_id: beatmap.beatmapset_id,
                        collection: mapper.username,
                        adder: user.username,
                        difficulty: beatmap.version,
                        title: beatmap.beatmapset.title,
                        artist: beatmap.beatmapset.artist,
                        creator: beatmap.beatmapset.creator,
                        creatorID: beatmap.beatmapset.user_id,
                        is_current: 0
                    })
                    console.log("added " + beatmap.beatmapset.title)
                }
            } else {
                console.log(validMap.title + " already exists")
            }
        }
        for (score in scores) {
            const currentScore = scores[score]
            let mods = "+NM";
            let hidden = false;
            if (currentScore.mods.includes("HR")) mods = "+HR"
            if (currentScore.mods.includes("DT")) mods = "+DT"
            if (currentScore.mods.includes("HD")) hidden = true;

            const validMap = await aimLists.findOne({ where: { map_id: currentScore.beatmap.id } })
            const beatmapID = currentScore.beatmap.id;
            if (validMap) {
                mapCount++;
                await tools.download_beatmaps({
                    type: 'difficulty',
                    host: 'osu',
                    id: beatmapID,
                    file_path: "./maps" + epoch + "/" + beatmapID + ".osu"
                });

                const bytes = fs.readFileSync("./maps" + epoch + "/" + beatmapID + ".osu");
                const map = new rosu.Beatmap(bytes);

                const aimScore = await aimScores.findOne({ where: { user_id: user.osu_id, map_id: beatmapID, mods: mods } })
                const maxAttrs = new rosu.Performance({ mods: currentScore.mods, lazer: false }).calculate(map);
                const currAttrs = new rosu.Performance({
                    mods: currentScore.mods, // Must be the same as before in order to use the previous attributes!
                    misses: currentScore.statistics.count_miss,
                    lazer: false,
                    accuracy: currentScore.accuracy * 100,
                    combo: currentScore.max_combo,
                }).calculate(maxAttrs);
                if (!balls.includes(currentScore.beatmapset.artist + " - " + currentScore.beatmapset.title + " [" + currentScore.beatmap.version + "]"))
                    balls.push(currentScore.beatmapset.artist + " - " + currentScore.beatmapset.title + " [" + currentScore.beatmap.version + "]")
                let accuracy = (currentScore.accuracy * 100).toFixed(2)
                if (aimScore) {
                    if (currentScore.statistics.count_miss < aimScore.misscount) {
                        if (aimScore.collection == currentD1Collection) {
                            newD1Misscount = newD1Misscount + (Number(aimScore.misscount) - Number(currentScore.statistics.count_miss))
                        }
                        if (aimScore.collection == currentD2Collection) {
                            newD2Misscount = newD2Misscount + (aimScore.misscount - currentScore.statistics.count_miss)
                        }
                        aimScore.misscount = currentScore.statistics.count_miss;
                        aimScore.score = currentScore.score;
                        aimScore.pp = (currAttrs.pp).toFixed(2);
                        aimScore.accuracy = accuracy;
                        aimScore.combo = currentScore.max_combo;
                        aimScore.date = currentScore.created_at;
                        aimScore.hidden = hidden;
                        console.log("updating misscount...")
                        aimScore.save();
                    }
                } else {
                    await aimScores.create({
                        map_id: beatmapID,
                        collection: validMap.collection,
                        index: validMap.id,
                        user_id: user.osu_id,
                        username: user.username,
                        mods: mods,
                        pp: (currAttrs.pp).toFixed(2),
                        score: currentScore.score,
                        accuracy: accuracy,
                        misscount: currentScore.statistics.count_miss,
                        combo: currentScore.max_combo,
                        max_combo: maxAttrs.state.maxCombo,
                        date: currentScore.created_at,
                        hidden: hidden,
                        is_current: 0
                    });
                }
                map.free();
                //console.log(user.username+": "+currentScore.score+" / mods: "+currentScore.mods+" / pp: "+
                //(currAttrs.pp).toFixed(2)+" / misscount: "+currentScore.statistics.count_miss+" / combo: "+currentScore.max_combo+"/"+maps.max_combo+" "+string)
            } else {
                console.log("map not found")
            }
            fs.unlink("./maps" + epoch + "/" + beatmapID + ".osu", function (err) {
                //console.log(err);
            });
        }
        fs.rmdir("./maps" + epoch, function (err) {
            console.log(err);
        });
        //console.log(balls)
        console.log("fgfd" + newD1Misscount)
        let text = mapCount + " new scores logged!\n"
        let text3 = "";
        let text2 = "";
        let text4 = "";
        const totalD1 = Math.abs(oldD1Misscount - newD1Misscount);
        const totalD2 = Math.abs(oldD2Misscount - newD2Misscount);
        if (newD1Misscount > 0) text3 = "new D1 misscount: " + oldD1Misscount + " -> " + totalD1 + "\n"
        if (newD2Misscount > 0) text4 = "new D2 misscount: " + oldD2Misscount + " -> " + totalD2 + "\n"
        if (balls.length > 0) {
            text2 = "maps played:\n"
            for (maps in balls) {
                text2 = text2 + balls[maps] + "\n"
            }
        }
        if (balls.length < 1) text = "no maps from lbs found"
        return await interaction.followUp({ content: text + text3 + text4 + text2 });
    },
};

