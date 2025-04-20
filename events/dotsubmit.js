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
                const string = "improved misscount by **" + diff + "**! (" + aimScore.misscount + " -> " + score.statistics.count_miss + ")"
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