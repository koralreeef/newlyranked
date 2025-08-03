const { Events } = require('discord.js');
const { Client } = require('osu-web.js');
const { clientIDv2, clientSecret, AccessToken } = require('../config.json');
const { osuUsers } = require('../db/dbObjects.js');
const { tools, v2, auth } = require('osu-api-extended')
const { setBeatmapID, getAccessToken } = require('../helper.js');
const { calcLazerPP, calcPP, generateRs, inputScore} = require('../rsHelper.js');
const axios = require('axios');
const rosu = require("rosu-pp-js");
const fs = require("fs");

const regex = /^\.rs \D{1,}/gm;
const regex2 = /^\.rs[0-9]+/gm
const regex3 = /^\.rs[0-9]+ /gm;

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        let msg = message.content.toLowerCase();
        let self = false;
        if (msg === ".rs") self = true;
        const r3 = regex3.test(msg.substring(0, msg.indexOf(" ")));
        if (regex.test(msg) || self || regex2.test(msg) || r3) {
            await auth.login({
                type: 'v2',
                client_id: clientIDv2,
                client_secret: clientSecret,
                cachedTokenPath: './test.json' // path to the file your auth token will be saved (to prevent osu!api spam)
            });
            let api = new Client(await getAccessToken());
            let usr = msg.substring(4);
            let selfName = await osuUsers.findOne({ where: { user_id: message.author.id } });
            let p = true;
            let offset = 1;
            let stop = false;
            if (msg.substring(3, 6) === " ~p") {
                p = false;
                self = true;
                if (msg.substring(6, 7) === " ") {
                    self = false;
                    usr = msg.substring(7);
                }
            }
            if (regex3.test(msg) && !stop) {
                if (msg.substring(msg.indexOf(" "), msg.indexOf(" ") + 1) === " ") {
                    //console.log("3")
                    self = false;
                    offset = msg.substring(3, msg.indexOf(" "));
                    usr = msg.substring(msg.indexOf(" ") + 1);
                    if (msg.substring(msg.indexOf(" ") + 1, msg.indexOf(" ") + 3) === "~p") {
                        usr = msg.substring(msg.indexOf(" ") + 4);
                        console.log("poo " + usr);
                        if (usr === "") usr = selfName.username;
                        p = false;
                    }
                    stop = true;
                }
            }
            //idk why this actually makes the check function lol
            regex2.test(msg)
            if (regex2.test(msg) && !stop) {
                //console.log("2")
                offset = msg.substring(3);
                self = true;
                usr = selfName.username;
            }
            //console.log(offset);
            //console.log(usr);
            let user;
            if (self && selfName)
                usr = selfName.username;
            try {
                user = await api.users.getUser(usr, 'osu', 'username', {
                    urlParams: {
                        mode: 'osu'
                    }
                });
            } catch (err) {
                return message.channel.send("couldnt find user");
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
                return message.channel.send("no score found or something went wrong (ping koral)");
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

                    //console.log(score);
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
                        mode: "osu",
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
                    //console.log(score);
                    const leaderboardString = await inputScore(ppData, score, accuracy, score.mods, message, lazer, ppData.details, api) ?? ""
                    const rsEmbed = await generateRs(beatmap, ppData, beatmapset, user, progress, mods, score, accuracy, clockRate, cs, topPlayIndex, globalTopIndex, modIndex);
                    message.channel.send({ content: leaderboardString, embeds: [rsEmbed] });
                } catch (err) {
                    console.log(err);
                    message.channel.send("no scores set within 24 hours or user hasnt used /osuset");
                }
            }
            else {
                message.channel.send("no scores set within 24 hours");
            }
        }
    }
}

//https://discordjs.guide/popular-topics/canvas.html#getting-started
//https://b.ppy.sh/thumb/<beatmapset_id>l.jpg
//need to implement collections to make rs easier