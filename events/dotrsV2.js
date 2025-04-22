const { Events, EmbedBuilder } = require('discord.js');
const { Client, calcModStat } = require('osu-web.js');
const { clientIDv2, clientSecret, AccessToken } = require('../config.json');
const { lightskyblue, gold, white } = require('color-name');
const { osuUsers, aimLists, aimScores } = require('../db/dbObjects.js');
const { tools, v2, auth } = require('osu-api-extended')
const { setBeatmapID, getAccessToken } = require('../helper.js');
const { hr, ez } = calcModStat;
const axios = require('axios');
const rosu = require("rosu-pp-js");
const fs = require("fs");

const regex = /^\.rs \D{1,}/gm;
const regex2 = /^\.rs[0-9]+/gm
const regex3 = /^\.rs[0-9]+ /gm;

function getLength(s) {
    minutes = Math.trunc(s / 60);
    seconds = Math.trunc(s - minutes * 60);
    if (seconds < 10) return minutes + ":0" + seconds;
    return minutes + ":" + seconds;
}
async function findMapStats(blob, beatmap, clockRate, cs) {
    const mapCS = "CS:  " + (cs).toFixed(2);
    const mapAR = "  AR:  " + (blob.stats.difficulty.ar).toFixed(2);
    const mapOD = "  OD:  " + (blob.stats.difficulty.od).toFixed(2);
    const mapBPM = "\nBPM:  " + (beatmap.bpm * clockRate).toFixed(2);
    const mapLength = "  Length:  " + getLength(beatmap.hit_length);
    return mapCS + mapAR + mapOD + mapBPM + mapLength;
}
async function calcLazerPP(score, map, total, modString) {
    let lazerMods = modString;
    await auth.login({
        type: 'v2',
        client_id: clientIDv2,
        client_secret: clientSecret,
        cachedTokenPath: './test.json' // path to the file your auth token will be saved (to prevent osu!api spam)
    });
    const details = await v2.scores.details({
        id: score.id,
    })
    let adjustSettings = [];
    let clockSettings = [];
    let dt = false;
    console.log(details);
    for (const mod of details.mods) {
        if (mod.acronym === "DA") {
            adjustSettings = mod.settings;
            lazerMods = modString + "DA";
        }
        if (mod.acronym === "DT") {
            dt = true;
            clockSettings = mod.settings;
        }
    }
    if (dt) {
        if (clockSettings.speed_change != 1.5)
            lazerMods = lazerMods + " (" + clockSettings.speed_change + "x)";
    }
    //console.log(details);
    console.log(clockSettings);
    console.log(adjustSettings);
    const cs = adjustSettings.circle_size ?? map.cs;
    const clockRate = clockSettings.speed_change ?? 1;
    const lazer_hits = {
        ok: details.statistics.ok ?? 0,
        great: details.statistics.great ?? 0,
        meh: details.statistics.meh ?? 0,
        miss: details.statistics.miss ?? 0,
        large_tick_hit: details.statistics.large_tick_hit ?? 0,
        slider_tail_hit: details.statistics.slider_tail_hit ?? 0,
    };
    const lazer_max_hits = {
        great: details.maximum_statistics.great,
        large_tick_hit: details.maximum_statistics.large_tick_hit,
        slider_tail_hit: details.maximum_statistics.slider_tail_hit,
    };
    const maxAttrs = new rosu.Performance({
        mods: modString,
        clockRate: clockRate,
        cs: adjustSettings.circle_size ?? map.cs,
        od: adjustSettings.overall_difficulty ?? map.od,
        ar: adjustSettings.approach_rate ?? map.ar
    }).calculate(map);
    const maxPP = (maxAttrs.pp).toFixed(2);
    const lazer_accuracy = tools.calculate_accuracy(lazer_hits, lazer_max_hits, 'osu', true);
    if (!score.passed) {
        const difficulty = new rosu.Difficulty({
            mods: modString,
            passedObjects: total,
            clockRate: clockRate,
            cs: adjustSettings.circle_size ?? map.cs,
            od: adjustSettings.overall_difficulty ?? map.od,
            ar: adjustSettings.approach_rate ?? map.ar
        });
        const gradualPerf = difficulty.gradualPerformance(map);
        const state = {
            maxCombo: score.max_combo,
            osuLargeTickHits: details.statistics.large_tick_hit ?? 0,
            sliderEndHits: details.statistics.slider_tail_hit ?? 0,
            n300: lazer_hits.great ?? 0,
            n100: lazer_hits.ok ?? 0,
            n50: lazer_hits.meh ?? 0,
            misses: lazer_hits.miss ?? 0
        };
        console.log(total);
        console.log(total - lazer_hits.ok - lazer_hits.meh - lazer_hits.miss);
        const FCAttrs = new rosu.Performance({
            mods: modString,
            clockRate: clockRate,
            osuLargeTickHits: details.maximum_statistics.large_tick_hit,
            sliderEndHits: details.maximum_statistics.slider_tail_hit,
            n300: total - lazer_hits.ok - lazer_hits.meh - lazer_hits.miss,
            n100: lazer_hits.ok,
            n50: lazer_hits.meh,
        }).calculate(maxAttrs);
        const currentPP = gradualPerf.nth(state, total - 1)?.pp.toFixed(2);
        const fcPP = (FCAttrs.pp).toFixed(2);
        return {
            stats: maxAttrs, currPP: currentPP, fcPP: fcPP, maxPP: maxPP,
            accuracy: lazer_accuracy.accuracy, clockRate: clockRate, cs: cs, adjust: adjustSettings ?? null, lazerMods
        }
    } else {
        const currAttrs = new rosu.Performance({
            mods: modString,
            clockRate: clockRate,
            osuLargeTickHits: details.statistics.large_tick_hit,
            sliderEndHits: details.statistics.slider_tail_hit,
            misses: details.statistics.miss,
            accuracy: lazer_accuracy.accuracy,
            combo: details.max_combo,
        }).calculate(maxAttrs);
        const FCAttrs = new rosu.Performance({
            mods: modString,
            clockRate: clockRate,
            accuracy: lazer_accuracy.fc_accuracy,
        }).calculate(maxAttrs);
        const currentPP = (currAttrs.pp).toFixed(2);
        const fcPP = (FCAttrs.pp).toFixed(2);
        return {
            stats: maxAttrs, currPP: currentPP, fcPP: fcPP, maxPP: maxPP,
            accuracy: lazer_accuracy.accuracy, clockRate: clockRate, cs: cs, adjust: adjustSettings ?? null, lazerMods
        }
    }
}
async function calcPP(score, map, total, modString) {
    let clockRate = 1;
    let cs = map.cs;
    const hits = {
        ok: score.statistics.count_100 ?? 0,
        great: score.statistics.count_300 ?? 0,
        meh: score.statistics.count_50 ?? 0,
        miss: score.statistics.count_miss ?? 0,
    }
    if (modString.includes("DT"))
        clockRate = 1.5;
    if (modString.includes("HT"))
        clockRate = 0.75;
    if (modString.includes("HR"))
        cs = hr.cs(cs);
    if (modString.includes("EZ"))
        cs = ez.cs(cs);
    const sc = tools.calculate_accuracy(hits, total, 'osu', false);
    const maxAttrs = new rosu.Performance({ mods: modString, lazer: false }).calculate(map);
    const maxPP = (maxAttrs.pp).toFixed(2);
    if (!score.passed) {
        const difficulty = new rosu.Difficulty({
            mods: modString,
            lazer: false,
            passedObjects: total,
        });
        const gradualPerf = difficulty.gradualPerformance(map);
        const state = {
            maxCombo: score.max_combo,
            n300: hits.great ?? 0,
            n100: hits.ok ?? 0,
            n50: hits.meh ?? 0,
            misses: hits.miss ?? 0
        };
        const FCAttrs = new rosu.Performance({
            mods: modString, // Must be the same as before in order to use the previous attributes!
            lazer: false,
            accuracy: sc.fc_accuracy,
            n100: hits.ok + 1,
        }).calculate(maxAttrs);
        const currentPP = gradualPerf.nth(state, total - 1)?.pp.toFixed(2);
        const fcPP = (FCAttrs.pp).toFixed(2);
        return { stats: maxAttrs, currPP: currentPP, fcPP: fcPP, maxPP: maxPP, accuracy: sc.accuracy, clockRate: clockRate, cs: cs }
    } else {
        const currAttrs = new rosu.Performance({
            mods: modString, // Must be the same as before in order to use the previous attributes!
            misses: score.statistics.count_miss,
            lazer: false,
            accuracy: sc.accuracy,
            combo: score.max_combo,
        }).calculate(maxAttrs);
        const FCAttrs = new rosu.Performance({
            mods: modString, // Must be the same as before in order to use the previous attributes!
            lazer: false,
            accuracy: sc.fc_accuracy,
            n100: hits.ok + 1,
        }).calculate(maxAttrs);
        const currentPP = (currAttrs.pp).toFixed(2);
        const fcPP = (FCAttrs.pp).toFixed(2);
        return { stats: maxAttrs, currPP: currentPP, fcPP: fcPP, maxPP: maxPP, accuracy: sc.accuracy, clockRate: clockRate, cs: cs }
    }
}
async function generateRs(beatmap, blob, beatmapset, user, progress, modString, score, accuracy, clockRate, cs, topPlayIndex, globalTopIndex, modIndex) {
    let specialString = " ";
    let modleaderboardIndex = "";
    let embedColor = lightskyblue;
    let rank = "";
    if (topPlayIndex != 0 && globalTopIndex != 0) {
        specialString = "**__New Top Play (#" + topPlayIndex + ") and Global Top #" + globalTopIndex + "!__** ";
    }
    else if (topPlayIndex != 0) {
        specialString = specialString + ("**__New Top Play! (#" + topPlayIndex + ")__** ");
    }
    else if (globalTopIndex != 0 && score.rank == "F") {
        specialString = specialString + ("**__Global Top #" + globalTopIndex + "__ (if passed)** ");
    }
    else if (globalTopIndex != 0) {
        specialString = specialString + ("**__Global Top #" + globalTopIndex + "!__** ");
    }
    if (beatmap.status != "approved" && beatmap.status != "ranked" && topPlayIndex != 0) {
        specialString = specialString + "** (if ranked) **";
    }
    if (modIndex > 0) {
        modleaderboardIndex = " **(#" + modIndex + ")**";
    }
    if (topPlayIndex > 0) {
        embedColor = gold;
    }
    if (topPlayIndex == 1) {
        embedColor = white;
    }
    switch (score.rank) {
        case "SSH":
            rank = "<:sshidden:1324402826255929407>"
            break;
        case "SH":
            rank = "<:Srankhidden:1324397032793964636>"
            break;
        case "X":
            rank = "<:ssrank:1324402828340498542>"
            break;
        case "S":
            rank = "<:srank:1324402824511098931>"
            break;
        case "A":
            rank = "<:arank:1324402781850701824>"
            break;
        case "B":
            rank = "<:brank:1324402783952306188>"
            break;
        case "C":
            rank = "<:crank:1324402785843675177>"
            break;
        case "D":
            rank = "<:drank:1324402787840426105>"
            break;
        case "F":
            rank = "<:frank:1324404867208450068>"
            break;
    }
    console.log(specialString);
    let diffValues = await findMapStats(blob, beatmap, clockRate, cs);
    let t = score.created_at;
    let date = Date.parse(t);
    let fcPPString = "~~(" + blob.fcPP + "pp)~~";
    let collectionName = ""
    let collectionIndex = 0;
    let collectionLength = 0;
    let collectionString = "";
    const aimMap = await aimLists.findOne({where: {map_id: beatmap.id}})

    if(aimMap){
        const maps = await aimLists.findAll({where: {collection: aimMap.collection}, order: [["map_id", "DESC"]]})
        let checking = true;
        let i = 0;
        while(checking){
            const found = await aimLists.findOne({where: {map_id: beatmap.id}})
            if(found.map_id === maps[i].map_id){
                collectionIndex = Number(i) + 1;
                checking = false;
            }
            i++;
        }
        collectionName = aimMap.collection
        collectionLength = maps.length
    }

    if(collectionLength > 0){
        collectionString = " map "+collectionIndex+"/"+collectionLength+" from "+collectionName
    }
    
    if (blob.fcPP < blob.currPP)
        fcPPString = "";
    let timestamp = Math.floor(date / 1000); //remove last subtraction after dst
    let rsEmbed = new EmbedBuilder()
        .setAuthor({
            name: "Most recent score by " + user.username + ":",
            url: "https://osu.ppy.sh/users/" + user.id,
            iconURL: "https://a.ppy.sh/" + user.id
        })
        .setTitle(beatmapset.artist + " - " + beatmapset.title + " [" + beatmap.version + "] " + (blob.stats.difficulty.stars).toFixed(2) + "✰")
        .setDescription(specialString)
        .setURL("https://osu.ppy.sh/b/" + beatmap.id)
        .setThumbnail("https://b.ppy.sh/thumb/" + beatmapset.id + "l.jpg")
        .addFields(
            {
                name: progress + " " + rank + " +**" + modString + "**" + modleaderboardIndex + "  |  **" + score.max_combo + "x/**" + blob.stats.difficulty.maxCombo + "x  |  <t:" + timestamp + ":R>",
                value: "**" + blob.currPP + "**/" + blob.maxPP + "PP " + fcPPString + " •  **" + accuracy.toFixed(2) + "%** • " + score.statistics.count_miss + " <:miss:1324410432450068555>",
                inline: false
            },
            {
                name: diffValues,
                value: " ",
                inline: false
            }
        )
        .setColor(embedColor)
        .setFooter({
            text: collectionString + "\n"+ beatmap.status + " mapset by " + beatmapset.creator,
            iconURL: "https://a.ppy.sh/" + beatmapset.user_id
        });
    return rsEmbed;
}
async function inputScore(blob, score, acc, modArray) {
    let accuracy = acc.toFixed(2)
    let mods = "+"
    let hidden = false
    console.log(modArray)
    if (modArray.includes("HD")) {
        hidden = true
    }
    if (modArray.includes("HR")) {
        mods = mods + "HR"
    }
    else if (modArray.includes("DT")) {
        mods = mods + "DT";
    } else {
        mods = mods + "NM";
    }
    const aimScore = await aimScores.findOne({
        where: { map_id: score.beatmap.id, user_id: score.user_id, mods: mods },
    });
    const validMap = await aimLists.findOne({
        where: { map_id: score.beatmap.id }
    })
    console.log(validMap)
    if (validMap && score.passed) {
        if (aimScore) {
            console.log("existing score found")
            if (score.statistics.count_miss < aimScore.misscount) {
                const diff = score.statistics.count_miss - aimScore.misscount
                const string = "improved misscount by **" + Math.abs(diff) + "**! (" + aimScore.misscount + " -> " + score.statistics.count_miss + ")"
                aimScore.misscount = score.statistics.count_miss;
                aimScore.score = score.score;
                aimScore.accuracy = accuracy;
                aimScore.combo = score.max_combo;
                aimScore.date = score.created_at;
                aimScore.hidden = hidden;
                console.log("updating misscount...")
                console.log(string)
                aimScore.save();
                return string
            }
            return ""
        } else {
            let is_current = 0;
            if(validMap.is_current == 1){
                is_current = 1;
            }
            console.log("creating new score")
            await aimScores.create({
                map_id: score.beatmap.id,
                collection: validMap.collection,
                index: validMap.id,
                user_id: score.user_id,
                username: score.user.username,
                mods: mods,
                score: score.score,
                accuracy: accuracy,
                misscount: score.statistics.count_miss,
                combo: score.max_combo,
                max_combo: blob.stats.difficulty.maxCombo,
                date: score.created_at,
                hidden: hidden,
                is_current: is_current
            });
            return "logged new score into leaderboard!"
        }
    }
}
module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        let msg = message.content;
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
                    console.log("3")
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
            console.log(regex2.test(msg));
            if (regex2.test(msg) && !stop) {
                console.log("2")
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
                return message.channel.send("no score found or you didnt use /osuset");
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
                    const leaderboardString = await inputScore(ppData, score, accuracy, score.mods)
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