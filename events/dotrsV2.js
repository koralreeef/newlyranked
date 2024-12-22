const { Events, EmbedBuilder } = require('discord.js');
const { Client, calcAccuracy, calcModStat  } = require('osu-web.js');
const { clientIDv2, clientSecret } = require('../config.json');
const { lightskyblue } = require('color-name');
const { osuUsers } = require('../db/dbObjects.js');
const { tools, v2, auth } = require('osu-api-extended')
const { setBeatmapID, getAccessToken } = require('../helper.js');
const { hr, ez } = calcModStat;
const rosu = require("rosu-pp-js");
const fs = require("fs");
const { monthsShort } = require('moment-timezone');
const shebangCommand = require('shebang-command');
const { RuleTester } = require('eslint');

const regex = /^\.rs \D{1,}/gm;
const regex2 = /^\.rs[0-9]+/gm
const regex3 = /^\.rs[0-9]+ /gm;
const regex4 = /^\.rs[0-9]+ ~p/gm;
const regex5 = /^\.rs[0-9]+ ~p /gm;
function getLength(s) {
	minutes = Math.trunc(s/60);
	seconds = Math.trunc(s - minutes*60);
	if(seconds < 10) return minutes+":0"+seconds;
    return minutes+":"+seconds;
}
async function findMapStats(blob, beatmap, clockRate, cs){
    const mapCS = "CS:  "+(cs).toFixed(2); 
    const mapAR = "  AR:  "+(blob.stats.difficulty.ar).toFixed(2);  
    const mapOD = "  OD:  "+(blob.stats.difficulty.od).toFixed(2);
    const mapBPM = "\nBPM:  "+(beatmap.bpm * clockRate).toFixed(2);  
    const mapLength = "  Length:  "+getLength(beatmap.hit_length);
    return mapCS+mapAR+mapOD+mapBPM+mapLength;
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
    for(const mod of details.mods){
        if(mod.acronym === "DA"){
            adjustSettings = mod.settings;
            lazerMods = modString + "DA";
        }
        if(mod.acronym === "DT"){
            dt = true;
            clockSettings = mod.settings;
        }
    }
    if(dt){
        if(clockSettings.speed_change != 1.5)
        lazerMods = lazerMods+" ("+clockSettings.speed_change+"x)";
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
    if(!score.passed){
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
    return {stats: maxAttrs, currPP: currentPP, fcPP: fcPP, maxPP: maxPP, 
        accuracy: lazer_accuracy.accuracy, clockRate: clockRate, cs: cs, adjust: adjustSettings ?? null, lazerMods }
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
    return {stats: maxAttrs, currPP: currentPP, fcPP: fcPP, maxPP: maxPP, 
        accuracy: lazer_accuracy.accuracy, clockRate: clockRate, cs: cs, adjust: adjustSettings ?? null, lazerMods }
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
    if(modString.includes("DT"))
        clockRate = 1.5;
    if(modString.includes("HT"))
        clockRate = 0.75;
    if(modString.includes("HR"))
        cs = hr.cs(cs); 
    if(modString.includes("EZ"))
        cs = ez.cs(cs); 
    const sc = tools.calculate_accuracy(hits, total, 'osu', false);
    const maxAttrs = new rosu.Performance({ mods: modString, lazer: false }).calculate(map);
    const maxPP = (maxAttrs.pp).toFixed(2);
        if(!score.passed){
            const difficulty = new rosu.Difficulty({ 
                mods: modString, 
                lazer: false,
                passedObjects: total, 
            });
            const gradualPerf = difficulty.gradualPerformance(map);
            const state = {
                maxCombo: score.max_combo,
                n300: hits.great  ?? 0,
                n100: hits.ok ?? 0,
                n50: hits.meh ?? 0,
                misses: hits.miss  ?? 0            
            };
            const FCAttrs = new rosu.Performance({
                mods: modString, // Must be the same as before in order to use the previous attributes!
                lazer: false,
                accuracy: sc.fc_accuracy,
                n100: hits.ok + 1,
            }).calculate(maxAttrs); 
            const currentPP = gradualPerf.nth(state, total - 1)?.pp.toFixed(2);
            const fcPP = (FCAttrs.pp).toFixed(2);
        return {stats: maxAttrs, currPP: currentPP, fcPP: fcPP, maxPP: maxPP, accuracy: sc.accuracy, clockRate: clockRate, cs: cs}
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
        return {stats: maxAttrs, currPP: currentPP, fcPP: fcPP, maxPP: maxPP, accuracy: sc.accuracy, clockRate: clockRate, cs: cs}
    }
}
async function generateRs(beatmap, blob, beatmapset, user, progress, modString, score, accuracy, clockRate, cs){
    let diffValues = await findMapStats(blob, beatmap, clockRate, cs);
    let t = score.created_at;
    let date = Date.parse(t);
    let timestamp = Math.floor(date/1000); //remove last subtraction after dst
    let rsEmbed = new EmbedBuilder()
    .setAuthor({ name: "Most recent score by "+user.username+":",
        iconURL: "https://a.ppy.sh/"+user.id
    })
    .setTitle(beatmapset.artist+" - "+beatmapset.title+" ["+beatmap.version+"] "+(blob.stats.difficulty.stars).toFixed(2)+"✰")
    .setURL("https://osu.ppy.sh/b/"+beatmap.id)
    .setThumbnail("https://b.ppy.sh/thumb/"+beatmapset.id+"l.jpg")
    .addFields(
        {
            name: progress+"**  "+score.rank+"**  |  +**"+modString+"**  |  **"+score.max_combo+"x/**"+blob.stats.difficulty.maxCombo+"x  |  <t:"+timestamp+":R>",
            value: "**"+blob.currPP+"**/"+blob.maxPP+"PP ~~("+blob.fcPP+"pp)~~ •  **"+accuracy.toFixed(2)+"%** • "+score.statistics.count_miss+" :x:",
            inline: false
        },
        {
            name: diffValues,
            value: " ",
            inline: false
        }
    )
    .setColor(lightskyblue)
    .setFooter({text : beatmap.status+" mapset by "+beatmapset.creator,
        iconURL: "https://a.ppy.sh/"+beatmapset.user_id 
    });
    return rsEmbed;
}

module.exports = {
	name: Events.MessageCreate,
	async execute(message) {
        let msg = message.content;
        let self = false;
        if(msg === ".rs") self = true; 
        const r3 = regex3.test(msg.substring(0, msg.indexOf(" ")));
        if(regex.test(msg) || self || regex2.test(msg) || r3) {
            let api = new Client(await getAccessToken());
            let usr = msg.substring(4);
            let selfName = await osuUsers.findOne({ where: {user_id: message.author.id }});
            let p = true;
            let offset = 1;
            let stop = false;
            console.log(regex2.test(msg));
            if(msg.substring(3, 6) === " ~p"){
                p = false;
                self = true;
                if(msg.substring(6, 7) === " "){
                    self = false;
                    usr = msg.substring(7);
                }
            }
            if(regex3.test(msg) && !stop){
                if(msg.substring(msg.indexOf(" "), msg.indexOf(" ") + 1) === " "){
                    console.log("3")
                    self = false;
                    offset = msg.substring(3, msg.indexOf(" "));
                    usr = msg.substring(msg.indexOf(" ") + 1);
                    if(msg.substring(msg.indexOf(" ") + 1, msg.indexOf(" ") + 3) === "~p"){
                        usr = msg.substring(msg.indexOf(" ") + 4);
                        p = false;
                    }
                    stop = true;
                }
            }
            if(regex4.test(msg) && !stop){
                console.log("4")
                offset = msg.substring(3, msg.indexOf("~") - 1,);
                self = true;
                p = false;
                usr = selfName.username;
                stop = true;
            }
            if(regex2.test(msg)&& !stop){
                console.log("2")
                offset = msg.substring(3);
                self = true;
                usr = selfName.username;
            }
            console.log(offset);
            console.log(usr);
            let user;
            if(self && selfName) 
            usr = selfName.username;
            try{
                user = await api.users.getUser(usr, 'osu', 'username', {
                    urlParams: {
                    mode: 'osu'
                    }
                });
            } catch (err) {
                return message.channel.send("couldnt find user");
            }
            let scores;
            try{
            scores = await api.users.getUserScores(user.id, 'recent', {
                query: {
                  mode: 'osu',
                  offset: offset - 1,
                  limit: 1,
                  include_fails: p
                }
              });
            } catch (err) {
                return message.channel.send("couldnt find score");
            }
            if(scores.length > 0){
            let score = scores[0];
            try{
                let lazer = true;
                //console.log(score.type);
                let modString = "";
                for(let i = 0; i < (score.mods).length; i++){
                    modString = modString + score.mods[i];
                }
                if(score.type != "solo_score"){
                    lazer = false;
                    modString = modString + "CL";
                }

                const result = await tools.download_beatmaps({
                    type: 'difficulty',
                    host: 'osu',
                    id: score.beatmap.id,
                    file_path: "./maps/"+score.beatmap.id+".osu"
                });
                console.log(result);

                const bytes = fs.readFileSync("./maps/"+score.beatmap.id+".osu");
                let map = new rosu.Beatmap(bytes);
                let ppData = {};
                let total = score.statistics.count_100 + score.statistics.count_300 + score.statistics.count_50 + score.statistics.count_miss;
                if(lazer){
                    ppData = await calcLazerPP(score, map, total, modString)
                } else {
                    ppData = await calcPP(score, map, total, modString)
                }
                
                //console.log(score);
                //console.log(ppData);   
                // Free the beatmap manually to avoid risking memory leakage.
                map.free();
                fs.unlink("./maps/"+score.beatmap.id+".osu", function(err){
                    console.log(err);
                });

                const beatmap = score.beatmap;
                const beatmapset = score.beatmapset;
                const user = score.user;
                const clockRate = ppData.clockRate;
                const accuracy = ppData.accuracy;
                const cs = ppData.cs;
                const mods = ppData.lazerMods ?? modString;
                let percentage = ppData.stats.state.n300;
                percentage = (total / percentage) * 100
                let progress = "@"+Math.round(percentage)+"%";
                if(percentage == 100) progress = "";

                const rsEmbed = await generateRs(beatmap, ppData, beatmapset, user, progress, mods, score, accuracy, clockRate, cs);
                message.channel.send({ embeds: [rsEmbed]});
                } catch (err){
                    console.log(err);
                    message.channel.send("no scores set in 24 hours or user hasnt used /osuset");
                }
            }
        }
    }
}

//https://discordjs.guide/popular-topics/canvas.html#getting-started
//https://b.ppy.sh/thumb/<beatmapset_id>l.jpg
//need to implement collections to make rs easier