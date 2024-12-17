const { Events, EmbedBuilder } = require('discord.js');
const { Client, calcAccuracy, calcModStat  } = require('osu-web.js');
const { AccessToken } = require('../config.json');
const { lightskyblue } = require('color-name');
const { osuUsers } = require('../db/dbObjects.js');
const { tools } = require('osu-api-extended')
const { setBeatmapID, getAccessToken } = require('../helper.js');
const { hr, dt, ez, ht } = calcModStat;
const rosu = require("rosu-pp-js");
const fs = require("fs");
const { FAILSAFE_SCHEMA } = require('js-yaml');
const { randomFillSync } = require('crypto');

const regex = /^\.lazer \D{1,}/gm;
const diff_increasing_mods = ['HR', 'DT', 'HT', 'EZ']
function getLength(s) {
	minutes = Math.trunc(s/60);
	seconds = Math.trunc(s - minutes*60);
	if(seconds < 10) return minutes+":0"+seconds;
    return minutes+":"+seconds;
}

function scrub(mods) {
    return mods.filter( //NF HD
        (x) => {
            console.log(x)
            return diff_increasing_mods.includes(x);
        }
    )
}

//THIS FUCKING SUCKS (edit its a little better edit its shit)
function findMapStats(mapCS, mapAR, mapOD, mapBPM, mapLength, dtLength, htLength, map, mod) {
    if(mod.includes("HR")){
        mapCS = "CS:  "+hr.cs(map.diff_size).toFixed(2);
        mapAR = "  AR:  "+hr.ar(map.diff_approach).toFixed(2);
        mapOD = "  OD:  "+hr.od(map.diff_overall).toFixed(2);
    }  
    if(mod.includes("EZ")){
        mapCS = "CS:  "+ez.cs(map.diff_size).toFixed(2);
        mapAR = "  AR:  "+ez.ar(map.diff_approach).toFixed(2);
        mapOD = "  OD:  "+ez.od(map.diff_overall).toFixed(2);
    } 
    if(mod.includes("DT"))
    {     
        mapAR = "  AR:  "+dt.ar(map.diff_approach).toFixed(2);  
        mapOD = "  OD:  "+dt.od(map.diff_overall).toFixed(2);
        mapBPM = "\nBPM:  "+dt.bpm(map.bpm).toFixed(2);  
        mapLength = "  Length:  "+getLength(dtLength);

            if(mod.includes("HR")){
                    mapAR = "  AR:  "+dt.ar(hr.ar(map.diff_approach)).toFixed(2);
                    mapOD = "  OD:  "+dt.ar(hr.od(map.diff_overall)).toFixed(2);
            }
            else if(mod.includes("EZ")){
                    mapAR = "  AR:  "+dt.ar(ez.ar(map.diff_approach)).toFixed(2);
                    mapOD = "  OD:  "+dt.od(ez.od(map.diff_overall)).toFixed(2);
            } 
    }
    else if(mod.includes("HT"))
    {  
        mapAR = "  AR:  "+ht.ar(map.diff_approach).toFixed(2);  
        mapOD = "  OD:  "+ht.od(map.diff_overall).toFixed(2);
        mapBPM = "\nBPM:  "+ht.bpm(map.bpm).toFixed(2);  
        mapLength = "  Length:  "+getLength(htLength);

            if(mod.includes("HR")){
                    mapAR = "  AR:  "+ht.ar(hr.ar(map.diff_approach)).toFixed(2);
                    mapOD = "  OD:  "+ht.ar(hr.od(map.diff_overall)).toFixed(2);
            }
            else if(mod.includes("EZ")){
                    mapAR = "  AR:  "+ht.ar(ez.ar(map.diff_approach)).toFixed(2);
                    mapOD = "  OD:  "+ht.od(ez.od(map.diff_overall)).toFixed(2);
            } 
    }  
    return mapCS+mapAR+mapOD+mapBPM+mapLength;
}

module.exports = {
	name: Events.MessageCreate,
	async execute(message) {
        let msg = message.content;
        let self = false;
        if(msg === ".lazer") self = true; 
        if(regex.test(msg) || self) {
            let api = new Client(await getAccessToken());
            let usr = msg.substring(7);
            let selfName = await osuUsers.findOne({ where: {user_id: message.author.id }});

            if(self && selfName) 
            usr = selfName.username;

            const user = await api.users.getUser(usr, 'osu', 'username', {
                urlParams: {
                  mode: 'osu'
                }
              });

            console.log(user.id);
            const scores = await api.users.getUserScores(user.id, 'recent', {
                query: {
                  mode: 'osu',
                  limit: 1,
                  include_fails: true
                }
              });
            if(scores.length > 0){
            let score = scores[0];
            try{
                console.log(score.mods.length)
                console.log("poo")
                let modString = "" ?? "CL";
                if(modString != "CL"){
                    for(let i = 0; i < score.mods.length; i++){
                        modString = modString + score.mods[i];
                    }
                }

                console.log(modString);
                const result = await tools.download_beatmaps({
                    type: 'difficulty',
                    host: 'osu',
                    id: score.beatmap.id,
                    file_path: "./maps/"+score.beatmap.id+".osu"
                });
                //console.log(result);
                //console.log(score);
                //console.log(score.max_combo);
                const bytes = fs.readFileSync("./maps/"+score.beatmap.id+".osu");
                let map = new rosu.Beatmap(bytes);
                let accuracy = score.accuracy * 100;
                let total = score.statistics.count_100 + score.statistics.count_300 + score.statistics.count_50 + score.statistics.count_miss;
                console.log(total);
                // Calculating performance attributes for a HDDT SS
                const maxAttrs = new rosu.Performance({ mods: "CL" }).calculate(map);
                // Calculating performance attributes for a specific score.
                
            if(!score.passed){
                let difficulty = new rosu.Difficulty({ mods: "CL", passedObjects: total, lazer: false });
                // Gradually calculating *performance* attributes
                let gradualPerf = difficulty.gradualPerformance(map);
                const state = {
                    maxCombo: score.max_combo,
                    n300: score.statistics.count_300,
                    n100: score.statistics.count_100,
                    n50: score.statistics.count_50,
                    misses: score.statistics.count_miss,
                };
                //console.log(state);
                message.channel.send(`fail, PP: ${(gradualPerf.nth(state, total - 1)?.pp.toFixed(2))}/${(maxAttrs.pp).toFixed(2)}`);
            } else {
                const currAttrs = new rosu.Performance({
                    mods: "CL", // Must be the same as before in order to use the previous attributes!
                    misses: score.statistics.count_miss,
                    lazer: false,
                    accuracy: accuracy,
                    combo: score.max_combo,
                    passedObjects: Number(total),
                }).calculate(maxAttrs); // Re-using previous attributes to speed up the calculation.
                //console.log(score.beatmap.version);
                //console.log(currAttrs);
                message.channel.send(`pass, PP: ${(currAttrs.pp).toFixed(2)}/${(maxAttrs.pp).toFixed(2)} | Stars: ${(maxAttrs.difficulty.stars).toFixed(2)}`);
            }
                // Free the beatmap manually to avoid risking memory leakage.
                map.free();
                fs.unlink("./maps/"+score.beatmap.id+".osu", function(err){
                    console.log(err);
                });
        } catch (err){
            console.log(err);
        }
        } else {
            message.channel.send("no scores set in 24 hours or user hasnt used /osuset");
        }
    }
    }
}

//https://discordjs.guide/popular-topics/canvas.html#getting-started
//https://b.ppy.sh/thumb/<beatmapset_id>l.jpg
//need to implement collections to make rs easier