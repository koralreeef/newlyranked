const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { Client, calcModStat } = require('osu-web.js');
const { clientIDv2, clientSecret, AccessToken, currentD1Collection, currentD2Collection, nmRole, hrRole, nmRole2, hrRole2, hundoRole, hundoRole2, ending } = require('../../config.json');
const { lightskyblue, gold, white } = require('color-name');
const { osuUsers, aimLists, aimScores } = require('../../db/dbObjects.js');
const { tools, v2, auth } = require('osu-api-extended')
const { setBeatmapID, getAccessToken } = require('../../helper.js');
const { calcLazerPP, calcPP, generateRs, inputScore } = require('../../rsHelper.js');
const { hr, ez } = calcModStat;
const axios = require('axios');
const rosu = require("rosu-pp-js");
const fs = require("fs");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rs')
        .setDescription('submits scores to the bot privately')
        .addBooleanOption(option =>
            option.setName('pass')
                .setDescription('if you want to filter for passes only'))
        .addNumberOption(option =>
            option.setName('offset')
                .setDescription('if you want to look for the not most recent score')),

    async execute(interaction) {
        await auth.login({
            type: 'v2',
            client_id: clientIDv2,
            client_secret: clientSecret,
            cachedTokenPath: './test.json' // path to the file your auth token will be saved (to prevent osu!api spam)
        });
        await interaction.deferReply({ephemeral: true});
        let api = new Client(await getAccessToken());
        let usr = await osuUsers.findOne({ where: { user_id: interaction.user.id } });
        let p = true;
        let offset = interaction.options.getNumber('offset') ?? 1;
        if (interaction.options.getBoolean('pass')) p = false
        let user;
        try {
            user = await api.users.getUser(usr.username, 'osu', 'username', {
                urlParams: {
                    mode: 'osu'
                }
            });
        } catch (err) {
            return await interaction.followUp({ content: "couldnt find user", ephemeral: true });
        }
        let scores;
        try {
            scores = await api.users.getUserScores(user.id, 'recent', {
                query: {
                    mode: 'osu',
                    offset: offset - 1,
                    limit: 1,
                    include_fails: p
                }
            });
        } catch (err) {
            return interaction.followUp({ content: "no score found or something went wrong (ping koral)", ephemeral: true });
        }
        if (scores.length > 0) {
            let score = scores[0];
            try {
                let lazer = true;
                //console.log(score.type);
                let modString = "";
                for (let i = 0; i < (score.mods).length; i++) {
                    modString = modString + score.mods[i];
                }
                if (score.type != "solo_score") {
                    lazer = false;
                    modString = modString + "CL";
                } else {
                    if(modString === "") modString = "NM"
                }

                const result = await tools.download_beatmaps({
                    type: 'difficulty',
                    host: 'osu',
                    id: score.beatmap.id,
                    file_path: "./maps/" + score.beatmap.id + ".osu"
                });

                //console.log(result);
                setBeatmapID(score.beatmap.id);
                const bytes = fs.readFileSync("./maps/" + score.beatmap.id + ".osu");
                let map = new rosu.Beatmap(bytes);
                let ppData = {};
                let total = score.statistics.count_100 + score.statistics.count_300 + score.statistics.count_50 + score.statistics.count_miss;
                if (lazer) {
                    ppData = await calcLazerPP(score, map, total, modString)
                } else {
                    ppData = await calcPP(score, map, total, modString)
                }

                console.log(score);
                //console.log(ppData);   
                // Free the beatmap manually to avoid risking memory leakage.
                map.free();
                fs.unlink("./maps/" + score.beatmap.id + ".osu", function (err) {
                    console.log(err);
                });

                const beatmap = score.beatmap;
                const beatmapset = score.beatmapset;
                const user = score.user;
                const clockRate = ppData.clockRate;
                const accuracy = ppData.accuracy;
                const cs = ppData.cs;
                let global = [];
                let foundPP = false;
                let foundTop = false;
                let foundModTop = false;
                let globalTopIndex = 0;
                let modIndex = 0;
                const mods = ppData.lazerMods ?? modString;
                const best = await v2.scores.list({
                    type: 'user_best',
                    limit: 100,
                    beatmap_id: score.beatmap.id,
                    user_id: user.id,
                });
                if (beatmap.status != "graveyard" && beatmap.status != "wip" && beatmap.status != "pending") {
                    const res = await axios.get("https://osu.ppy.sh/api/get_scores?k=" + AccessToken + "&b=" + score.beatmap.id + "&limit=50");
                    global = res.data;
                    global.reverse();
                    //console.log(res.data)
                    if (score.score == global[global.length - 1].score) {
                        //console.log(score.score);
                        globalTopIndex = 1;
                    }
                    else if (score.score < global[0].score) {
                        console.log(score.score + " < " + global[0].score);
                        globalTopIndex = 0;
                    } else {
                        for (let i in global) {
                            if (global[i].score > score.score && foundTop == false) {
                                globalTopIndex = Math.abs(Number(i) - global.length - 1);
                                //console.log(global[i].score+" "+score.score);
                                foundTop = true;
                            }
                        }
                    }

                    let enumSum = 0;

                    //there has to be a better way
                    if (mods.includes("HR"))
                        enumSum = enumSum + 16;
                    if (mods.includes("HD"))
                        enumSum = enumSum + 8;
                    if (mods.includes("DT"))
                        enumSum = enumSum + 64;
                    if (mods.includes("NF"))
                        enumSum = enumSum + 1;
                    if (mods.includes("EZ"))
                        enumSum = enumSum + 2;
                    if (mods.includes("SD"))
                        enumSum = enumSum + 32;

                    const res2 = await axios.get("https://osu.ppy.sh/api/get_scores?k=" + AccessToken + "&b=" + beatmap.id + "&mods=" + enumSum + "&limit=100");
                    const modscores = res2.data;
                    //console.log(modscores);
                    //CATCHING SD LEADERBOARDS WOW
                    if (modscores.length > 0) {
                        modscores.reverse();
                        if (score.score == modscores[modscores.length - 1].score) {
                            //console.log(score.score);
                            modIndex = 1;
                        }
                        else if (score.score < modscores[0].score) {
                            console.log(score.score + " < " + modscores[0].score);
                            modIndex = 0;
                        } else {
                            for (let i in modscores) {
                                if (modscores[i].score > score.score && foundModTop == false) {
                                    modIndex = Math.abs(Number(i) - modscores.length - 1);
                                    //console.log(global[i].score+" "+score.score);
                                    foundModTop = true;
                                }
                            }
                        }
                    }
                }
                let newScorePP = ppData.currPP;
                let topPlayIndex = 0;
                best.reverse();
                console.log(best[best.length - 1].pp + " || " + newScorePP)
                if (best[0].pp < newScorePP) {
                    if (newScorePP == Number((best[best.length - 1].pp).toFixed(2)) && foundPP == false) {
                        topPlayIndex = 1;
                        foundPP = true;
                    } else {
                        for (let i in best) {
                            if (best[i].pp > newScorePP && foundPP == false) {
                                //so bad
                                topPlayIndex = Math.abs(Number(i) - 101);
                                console.log(topPlayIndex);
                                foundPP = true;
                            }
                        }
                    }
                }

                let percentage = ppData.stats.state.n300;
                percentage = (total / percentage) * 100
                let progress = "@" + Math.round(percentage) + "%";
                if (percentage == 100) progress = "";
                const leaderboardString = await inputScore(ppData, score, accuracy, score.mods, interaction, lazer, ppData.details, api)
                const rsEmbed = await generateRs(beatmap, ppData, beatmapset, user, progress, mods, score, accuracy, clockRate, cs, topPlayIndex, globalTopIndex, modIndex);
                interaction.followUp({ content: leaderboardString, embeds: [rsEmbed], ephemeral: true });
            } catch (err) {
                console.log(err);
                await interaction.followUp({ content: "no scores set within 24 hours or user hasnt used /osuset", ephemeral: true });
            }
        }
        else {
            await interaction.followUp({ content: "no scores set within 24 hours", ephemeral: true });
        }
    }
}

//https://discordjs.guide/popular-topics/canvas.html#getting-started
//https://b.ppy.sh/thumb/<beatmapset_id>l.jpg
//need to implement collections to make rs easier