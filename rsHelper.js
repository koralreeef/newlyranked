const { EmbedBuilder } = require('discord.js');
const { calcModStat } = require('osu-web.js');
const { clientIDv2, clientSecret, currentD1Collection, currentD2Collection, nmRole, hrRole, nmRole2, hrRole2, hundoRole, hundoRole2, ending } = require('./config.json');
const { lightskyblue, gold, white } = require('color-name');
const { osuUsers, aimLists, aimScores } = require('./db/dbObjects.js');
const { tools, v2, auth} = require('osu-api-extended')
const { hr, ez } = calcModStat;
const rosu = require("rosu-pp-js");

async function createLeaderboard(api, id, user) {
    let added = false;
    const unique = []
    const unfiltered = await aimLists.findAll()
    for (entry in unfiltered) {
        if (!unique.includes(unfiltered[entry].creatorID)){ 
            unique.push(unfiltered[entry].creatorID)
        }
    }
    let mapperUsername = "";
    const validMap = await aimLists.findOne({ where: { map_id: id } })
    if (!validMap) {
        let beatmap;
        try {
            beatmap = await api.beatmaps.getBeatmap(id);
        } catch (err) {
            console.log(err)
        }
        if (unique.includes(String(beatmap.beatmapset.user_id))) {
            let mapper = "";
            try {
                mapper = await api.users.getUser(beatmap.beatmapset.user_id);
            } catch (err) {
                console.log(err)
            }
            mapperUsername = mapper.username
            await aimLists.create({
                map_id: id,
                set_id: beatmap.beatmapset_id,
                collection: mapperUsername,
                adder: user,
                difficulty: beatmap.version,
                title: beatmap.beatmapset.title,
                artist: beatmap.beatmapset.artist,
                creator: mapper.username,
                creatorID: beatmap.beatmapset.user_id,
                is_current: 0,
                required_dt: 0
            })
            console.log("added " + beatmap.beatmapset.title)
            added = true
        }
    } else {
        console.log(validMap.title + " already exists")
    }
    return added;
}
function getLength(s) {
    minutes = Math.trunc(s / 60);
    seconds = Math.trunc(s - minutes * 60);
    if (seconds < 10) return minutes + ":0" + seconds;
    return minutes + ":" + seconds;
}
async function findMapStats(blob, beatmap, clockRate, cs, mod) {
    const mapCS = "CS:  " + (cs).toFixed(2);
    const mapAR = "  AR:  " + (blob.stats.difficulty.ar).toFixed(2);
    //LOL
    const mapOD = "  OD:  " + ((80-blob.stats.difficulty.greatHitWindow.toFixed(2))/6).toFixed(2);
    const mapBPM = "\nBPM:  " + (beatmap.bpm * clockRate).toFixed(2);
    const mapLength = "  Length:  " + getLength((beatmap.hit_length / clockRate).toFixed(0));
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
    let rate = 1;
    //console.log(details);
    for (const mod of details.mods) {
        if (mod.acronym === "DA") {
            adjustSettings = mod.settings;
            lazerMods = modString + "DA";
        }
        if (mod.acronym === "DT" || mod.acronym === "NC") {
            dt = true;
            rate = 1.5;
            clockSettings = mod.settings;
        }
        if (mod.acronym === "CL") {
            console.log(mod.settings)
            lazerMods = modString + "CL";
        }
    }
    if (dt) {
        console.log(clockSettings)
        if (clockSettings){
            if (clockSettings.speed_change != 1.5)
                rate = clockSettings.speed_change;
                lazerMods = lazerMods + " (" + clockSettings.speed_change + "x)";
        }
    }
    //console.log(details);
    const cs = adjustSettings.circle_size ?? map.cs;
    const clockRate = rate;
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
            accuracy: lazer_accuracy.accuracy, clockRate: clockRate, cs: cs, adjust: adjustSettings ?? null, lazerMods,
            details: details
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
    let leaderboardMods = "";
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
    if (modString.includes("HR")) {
        leaderboardMods = "+HR"
    } else {
        leaderboardMods = "+NM"
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

    let diffValues = await findMapStats(blob, beatmap, clockRate, cs, modString);
    let t = score.created_at;
    let date = Date.parse(t);
    let fcPPString = "~~(" + blob.fcPP + "pp)~~";
    let collectionName = ""
    let collectionIndex = 0;
    let collectionLength = 0;
    let collectionString = "";
    let timestamp = Math.floor(date / 1000); //remove last subtraction after dst

    const aimMap = await aimLists.findOne({ where: { map_id: beatmap.id } })

    if (aimMap) {
        const maps = await aimLists.findAll({ where: { collection: aimMap.collection }, order: [["map_id", "DESC"]] })
        let checking = true;
        let i = 0;
        while (checking) {
            const found = await aimLists.findOne({ where: { map_id: beatmap.id } })
            if (found.map_id === maps[i].map_id) {
                collectionIndex = Number(i) + 1;
                checking = false;
            }
            i++;
        }
        collectionName = aimMap.collection
        collectionLength = maps.length
        if (beatmap.status == "graveyard" || beatmap.status == "wip" || beatmap.status == "pending") {
            if (progress == "") {
                checking = true;
                i = 0;
                let rank = 0;
                const scores = await aimScores.findAll({ where: { map_id: beatmap.id, mods: leaderboardMods }, order: [["misscount", "ASC"]] })
                const found = await aimScores.findOne({ where: { map_id: beatmap.id, mods: leaderboardMods, user_id: user.id } })
                if(found){
                    while (checking) {
                        if (found.user_id == scores[i].user_id) {
                            rank = Number(i) + 1;
                            checking = false;
                        }
                        if (i == scores.length - 1) {
                            rank = Number(i) + 1;
                            checking = false;
                        }
                        i++;
                    }
                } else {
                    rank = 1;
                }
                modleaderboardIndex = " **(#" + rank + ")**";
            }
        }
    }

    if (collectionLength > 0) {
        collectionString = " map " + collectionIndex + "/" + collectionLength + " from " + collectionName
    }

    if (blob.fcPP < blob.currPP)
        fcPPString = "";
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
            text: collectionString + "\n" + beatmap.status + " mapset by " + beatmapset.creator,
            iconURL: "https://a.ppy.sh/" + beatmapset.user_id
        });
    return rsEmbed;
}
async function inputScore(blob, score, acc, modArray, message, lazer, details, api) {
    const epoch = Date.now();
    //store two versions of best score
    //ugh thats so annoying man
    let accuracy = acc.toFixed(2)
    let mods = "+"
    let hidden = false
    console.log(modArray)
    if (modArray.includes("EZ")) return;
    if (modArray.includes("HD")) {
        hidden = true
    }
    if (modArray.includes("DT") || modArray.includes("NC")) {
        mods = mods + "DT";
    }
    if (modArray.includes("HR")) {
        mods = mods + "HR"
    }
    if(mods === "+"){
        mods = mods + "NM";
    }
    if (lazer) {
        const banned = ["DA", "DC", "HT"]
        if (details) {
            for (const mod of details.mods) {
                if (banned.includes(mod.acronym)) return
                if (mod.acronym === "CL") {
                    console.log(mod.settings)
                    for (key in mod.settings) {
                        console.log("hey man")
                        console.log(key)
                        if (key === "classic_note_lock") return
                    }
                }
            }
        }
        console.log("im through!!"+mods)
    }

    const added = await createLeaderboard(api, score.beatmap.id, score.user.username)
    const validMaps = await aimLists.findAll({
        where: { map_id: score.beatmap.id }
    })
    //IS THIS N OR IS THIS DIVINE INTELLECT 
    let collectionName = "";
    let validMap;
    let dtCheck;
    let hrCheck;
    let dthrCheck;
    if(validMaps.length > 0){
        for(collection in validMaps){
            console.log("check check " + validMaps[collection].collection +"\nother collection check "+currentD2Collection)
            if(validMaps[collection].collection == currentD2Collection && epoch < ending){
                collectionName = currentD2Collection;
                validMap = validMaps[collection]
            } 
            else if(validMaps[collection].collection == currentD1Collection && epoch < ending){
                collectionName = currentD1Collection;
                validMap = validMaps[collection]
            } else {
                collectionName = validMaps[collection].collection
                validMap = validMaps[collection]
            }
        }
        dtCheck = !(validMap.required_dt && !mods.includes("DT"))
        hrCheck = !(validMap.required_hr && !mods.includes("HR"))
    }
    //console.log(collectionName)
    //console.log(validMaps)
    const aimScore = await aimScores.findOne({
        where: { map_id: score.beatmap.id, collection: collectionName, user_id: score.user_id, mods: mods },
    });
    console.log("\ndt check "+dtCheck)
    console.log("\nhr check "+hrCheck)
    //check for time later
    //add patch from test2.js for storing multiple scores
    if (validMap && score.passed && dtCheck && hrCheck) {
        let dt = false;
        let hr = false;
        let dthr = false;
        let currentCollection = await aimLists.count({
            where: { collection: collectionName, required_dt: false },
        });
        console.log(mods + " " + mods.includes("DTHR"))
        if(mods.includes("DTHR")){
            dthr = true;
            currentCollection = await aimLists.count({
            where: { collection: collectionName, required_dt: true, required_hr: true },
        });
        }
        else if(mods.includes("DT")){
            dt = true;
            currentCollection = await aimLists.count({
            where: { collection: collectionName, required_dt: true },
        });
        }
        else if(mods.includes("HR")){
            hr = true;
            currentCollection = await aimLists.count({
            where: { collection: collectionName, required_hr: true },
        });
        }
        if (aimScore) {
            console.log("existing score found")
            const same = await aimScores.findOne({ where: {map_id: score.beatmap.id, user_id: score.user_id, mods: mods, pp: blob.currPP}})
            if (score.statistics.count_miss < aimScore.misscount) {
                const diff = score.statistics.count_miss - aimScore.misscount;
                const oldMisscount = aimScore.misscount;
                aimScore.misscount = score.statistics.count_miss;
                aimScore.score = score.score;
                aimScore.pp = blob.currPP;
                aimScore.accuracy = accuracy;
                aimScore.combo = score.max_combo;
                aimScore.date = score.created_at;
                aimScore.hidden = hidden;
                console.log("updating misscount...")
                aimScore.save();
                const scores = await aimScores.findAll({
                    where: { map_id: score.beatmap.id },
                    order: [
                        ["misscount", "ASC"],
                    ]
                })
                let checking = true;
                let i = 0;
                let rank = 0;
                //CHANGE THIS
                const found = await aimScores.findOne({ where: { map_id: score.beatmap.id, collection: collectionName, user_id: score.user_id, date: score.created_at }, order: [["misscount", "ASC"]] })
                while (checking) {
                    if (found.misscount <= scores[i].misscount) {
                        rank = Number(i) + 1;
                        checking = false;
                    }
                    if (i == scores.length - 1) {
                        rank = Number(i) + 1;
                        checking = false;
                    }
                    i++;
                }
                const string = "improved misscount by **" + Math.abs(diff) + "**! (" + oldMisscount + " -> " + score.statistics.count_miss +
                    ")\nnew leaderboard rank: **#" + rank + "**/" + scores.length
                return string
            } else if (blob.currPP > aimScore.pp && !same) {
                //YOLO
                const diff = blob.currPP - aimScore.pp;
                await aimScores.create({
                    map_id: score.beatmap.id,
                    collection: validMap.collection,
                    index: validMap.id,
                    user_id: score.user_id,
                    username: score.user.username,
                    mods: mods,
                    pp: blob.currPP,
                    score: score.score,
                    accuracy: accuracy,
                    misscount: score.statistics.count_miss,
                    combo: score.max_combo,
                    max_combo: blob.stats.difficulty.maxCombo,
                    date: score.created_at,
                    hidden: hidden,
                    is_current: 0,
                    required_dt: validMap.required_dt,
                    required_hr: validMap.required_hr,
                });
                const string = "gained **" + Math.abs(diff).toFixed(2) + "** pp! (" + aimScore.pp + " -> " + blob.currPP + ")"
                return string
            }
            return ""
        } else {
            let is_current = 0;
            if (validMap.is_current == 1) {
                is_current = 1;
            }
            console.log("creating new score")
            const preEntry = await aimScores.findAll({
                where: { user_id: score.user_id, collection: collectionName, mods: mods, required_dt: dt}
            })
            const uniquePreEntry = []
            const mapIDsPreEntry = []
            for (s in preEntry) {
                if (!mapIDsPreEntry.includes(preEntry[s].map_id)) {
                    mapIDsPreEntry.push(preEntry[s].map_id)
                    uniquePreEntry.push(preEntry[s].map_id)
                    //console.log(scores[score].map_id)
                }
            }
            console.log(uniquePreEntry)
            await aimScores.create({
                map_id: score.beatmap.id,
                collection: validMap.collection,
                index: validMap.id,
                user_id: score.user_id,
                username: score.user.username,
                mods: mods,
                pp: blob.currPP,
                score: score.score,
                accuracy: accuracy,
                misscount: score.statistics.count_miss,
                combo: score.max_combo,
                max_combo: blob.stats.difficulty.maxCombo,
                date: score.created_at,
                hidden: hidden,
                is_current: 0,
                required_dt: validMap.required_dt,
                required_hr: validMap.required_hr,
            });
            const scores = await aimScores.findAll({
                where: { map_id: score.beatmap.id, collection: collectionName },
                order: [
                    ["misscount", "ASC"],
                ]
            })
            const complete = await aimScores.findAll({
                where: { user_id: score.user_id, collection: collectionName, mods: mods, required_dt: dt}
            })
            const uniqueComplete = []
            const mapIDsComplete = []
            for (e in complete) {
                if (!mapIDsComplete.includes(complete[e].map_id)) {
                    mapIDsComplete.push(complete[e].map_id)
                    uniqueComplete.push(complete[e])
                    //console.log(scores[score].map_id)
                }
            }
            console.log("asdad" + uniquePreEntry.length)
            console.log("asd" + uniqueComplete.length)
            let newmap = "";
            if(added) {
                newmap = " and map"
            }
            const mod = mods.substring(1)
            let congrats = "logged new " + mod + " score"+newmap+" into " + validMap.collection + "!"
            if ((collectionName == currentD1Collection || collectionName == currentD2Collection) && uniquePreEntry.length == currentCollection - 1 && uniqueComplete.length == currentCollection) {
                const user = await osuUsers.findOne({where: {osu_id: score.user_id}})
                //redo conditionals for giving hundo role
                //get guild member object from the user id from the score, not the message
                if (collectionName == currentD1Collection) {
                    if(mod.includes("DT")){ user.dt1 = true; }
                    else if(mod.includes("NM")){ user.nm1 = true; }
                    else if(mod == "HR"){ user.hr1 = true; }
                    user.save()
                    if(user.nm1 && user.dt1 && user.hr1){ 
                        congrats = "🎉🎉🎉 congrats on 100% completion for " + validMap.collection + "!!! 🎉🎉🎉";
                        await message.member.roles.add(hundoRole).catch(console.error);
                    }
                    else if (user.nm1 && user.dt1) await message.member.roles.add(nmRole).catch(console.error);
                    else if (user.hr1) await message.member.roles.add(hrRole).catch(console.error);
                } else if (collectionName == currentD2Collection) {
                    if(mod.includes("DT")){ user.dt2 = true; }
                    else if(mod.includes("NM")){ user.nm2 = true; }
                    else if(mod == "HR"){ user.hr2 = true; }
                    user.save()
                    if(user.nm2 && user.dt2 && user.hr2){ 
                        congrats = "🎉🎉🎉 congrats on 100% completion for " + validMap.collection + "!!! 🎉🎉🎉";
                        await message.member.roles.add(hundoRole2).catch(console.error);
                    }
                    else if (user.nm2 && user.dt2) await message.member.roles.add(nmRole2).catch(console.error);
                    else if (user.hr2) await message.member.roles.add(hrRole2).catch(console.error);
                }
                //fix this
            }
            let checking = true;
            let i = 0;
            let rank = 0;
            const found = await aimScores.findOne({ where: { map_id: score.beatmap.id, collection: collectionName, user_id: score.user_id, date: score.created_at }, order: [["misscount", "ASC"]] })
            while (checking) {     
                if (scores.length == 1) {
                    rank = 1;
                    checking = false;
                }
                 //SURELY THERES SOMETHING BETTER THAN THIS CONDITION
                else if (found.misscount <= scores[i].misscount) {
                    const sameCount = await aimScores.count({ where: { map_id: score.beatmap.id, collection: collectionName, misscount: found.misscount }})
                    rank = Number(i) + sameCount;
                    checking = false;
                }
                else if (i == scores.length - 1) {
                    rank = Number(i) + 1;
                    checking = false;
                }
                i++;
            }
            return congrats + "\noverall leaderboard rank: **#" + rank + "**/" + scores.length
        }
    }
}

module.exports = { createLeaderboard, getLength, findMapStats,
                    calcLazerPP, calcPP, generateRs, inputScore};