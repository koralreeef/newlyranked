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

async function createLeaderboard(mappers, api, id, user) {
    let added = "";
    let mapperUsername = "";
    const validMap = await aimLists.findOne({ where: { map_id: id } })
    if (!validMap) {
        let beatmap;
        try {
            beatmap = await api.beatmaps.getBeatmap(id);
        } catch (err) {
            console.log(err)
        }
        if (mappers.includes(String(beatmap.beatmapset.user_id))) {
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
                is_current: 0
            })
            console.log("added " + beatmap.beatmapset.title)
            added = beatmap.beatmapset.artist+" - "+beatmap.beatmapset.title+" ["+beatmap.version+"]"
        }
    } else {
        console.log(validMap.title + " already exists")
    }
    return {
        added: added,
        creator: mapperUsername
    }
}

function arrayToString(array) {
    let string = "";
    for(index in array){
        if(index == array.length - 1){ 
            string = string + array[index]
        } else {
            string = string + array[index] +", "   
        }
    }
    return string
}

function arrayToString2(array) {
    let string = "";
    for(index in array){
        if(index == array.length - 1){ 
            string = string + array[index]
        } else {
            string = string + array[index] +"\n"   
        }
    }
    return string
}

module.exports = {
    cooldown: 300,
    data: new SlashCommandBuilder()
        .setName('processmulti')
        .setDescription('processes a multiplayer (SV1) lobby and submits scores for everyone playing')
        .addStringOption(option =>
            option.setName('multi_id')
                .setDescription('paste the multi id (https://osu.ppy.sh/community/matches/[117868813])')
                .setRequired(true)),

    async execute(interaction) {
        const user = await osuUsers.findOne({ where: { user_id: interaction.user.id } })
        if (!user) return await interaction.reply({ content: 'please use /osuset before using this command', ephemeral: true });
        const match_id = interaction.options.getString('multi_id')
        let jsAPI = new Client(await getAccessToken());
        let mapCount = 0;
        const players = [];
        const collections = [];
        const mapList = [];
        await interaction.deferReply();
        const epoch = Date.now();

        const url = new URL(
            "https://osu.ppy.sh/oauth/token"
        );
    
        const headers = {
            "Accept": "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
        };
    
        let body = "client_id=" + clientIDv2 + "&client_secret=" + clientSecret + "&grant_type=client_credentials&scope=public";
        const response = await fetch(url, {
            method: "POST",
            headers,
            body: body,
        }).then(response => response.json());
        let token = response.access_token;
        api = new Client(token);
        await auth.login({
            type: 'v2',
            client_id: clientIDv2,
            client_secret: clientSecret,
            cachedTokenPath: './test.json' // path to the file your auth token will be saved (to prevent osu!api spam)
        });

        const result = await v2.matches.details({
            match_id: match_id,
            limit: 1
        });
        if (result.error != null) {
            console.log(result.error);
            return await interaction.reply({ content: 'couldnt find match, double check your multi id', ephemeral: true });
        };

        const eventArray = await v2.matches.details({
            match_id: match_id,
            after: result.first_event_id,
        });
        const matchArray = []
        for (event in eventArray.events) {
            if (eventArray.events[event].detail.type == "other") {
                matchArray.push(eventArray.events[event])
            }
        }

        const unique = []
        const unfiltered = await aimLists.findAll()
        for (entry in unfiltered) {
            if (!unique.includes(unfiltered[entry].creatorID)){ 
                unique.push(unfiltered[entry].creatorID)
            }
        }
        const dir = fs.mkdirSync("./maps" + epoch);
        await sleep(1_000)
        //console.log(unique)
        const newMaps = [];
        for (maps in matchArray) {  
            const gameScores = matchArray[maps].game.scores;
            const beatmap = matchArray[maps].game.beatmap_id;
            const newMap = await createLeaderboard(unique, jsAPI, beatmap, user.username)
            console.log(newMap.added)
            if((newMap.added).length > 0) newMaps.push(newMap.added) 
            const beatmapData = await aimLists.findOne({ where: { map_id: beatmap } })
            const found = await aimScores.findOne({ where: { map_id: beatmap } }) ?? newMap.creator;
            if (beatmapData) {
                await tools.download_beatmaps({
                    type: 'difficulty',
                    host: 'osu',
                    id: beatmap,
                    file_path: "./maps" + epoch + "/" + beatmap + ".osu"
                });
    
                const bytes = fs.readFileSync("./maps" + epoch + "/" + beatmap + ".osu");
                const map = new rosu.Beatmap(bytes);
                console.log("map: " + beatmapData.artist + " - " + beatmapData.title + " ["+beatmapData.difficulty+"]"
                )
                if(!mapList.includes(beatmapData.artist + " - " + beatmapData.title + " ["+beatmapData.difficulty+"]")) {
                    mapList.push(beatmapData.artist + " - " + beatmapData.title + " ["+beatmapData.difficulty+"]")
                    mapCount++;
                }
                for (score in gameScores) {
                    const currentScore = gameScores[score]
                    const user = await osuUsers.findOne({ where: { osu_id: currentScore.user_id } })
                    if (currentScore.rank != "F" && user) {
                        if(!collections.includes(beatmapData.collection)) collections.push(beatmapData.collection)
                        if(!players.includes(user.username)) players.push(user.username)
                        let mods = "+NM";
                        let hidden = false;
                        if (currentScore.mods.includes("HR")) mods = "+HR"
                        if (currentScore.mods.includes("DT")) mods = "+DT"
                        if (currentScore.mods.includes("HD")) hidden = true;
                        const maps = await aimScores.findOne({ where: { map_id: beatmap } })
                        const aimScore = await aimScores.findOne({ where: { user_id: user.osu_id, map_id: beatmap, mods: mods } })
                        const maxAttrs = new rosu.Performance({ mods: currentScore.mods, lazer: false }).calculate(map);
                        const currAttrs = new rosu.Performance({
                            mods: currentScore.mods, // Must be the same as before in order to use the previous attributes!
                            misses: currentScore.statistics.count_miss,
                            lazer: false,
                            accuracy: currentScore.accuracy * 100,
                            combo: currentScore.max_combo,
                        }).calculate(maxAttrs);
                        let accuracy = (currentScore.accuracy * 100).toFixed(2)
                        if (aimScore) {
                            if (currentScore.statistics.count_miss < aimScore.misscount) {
                                aimScore.misscount = currentScore.statistics.count_miss;
                                aimScore.score = currentScore.score;
                                aimScore.pp = (currAttrs.pp).toFixed(2);
                                aimScore.accuracy = accuracy;
                                aimScore.combo = currentScore.max_combo;
                                aimScore.date = currentScore.created_at;
                                aimScore.max_combo = found.max_combo,
                                aimScore.hidden = hidden;
                                console.log("updating misscount...")
                                aimScore.save();
                            }
                        } else {
                            await aimScores.create({
                                map_id: beatmap,
                                collection: found,
                                index: beatmapData.id,
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
                        //console.log(user.username+": "+currentScore.score+" / mods: "+currentScore.mods+" / pp: "+
                        //(currAttrs.pp).toFixed(2)+" / misscount: "+currentScore.statistics.count_miss+" / combo: "+currentScore.max_combo+"/"+maps.max_combo)
                    } else {
                        console.log("user not found or failed")
                    }
                }
                map.free();
                fs.unlink("./maps" + epoch + "/" + beatmap + ".osu", function (err) {
                    console.log(err);
                });
            } else {
                console.log("map not found in collections, skipping...")
            }
        }
        await sleep(1000)
        fs.rmdir("./maps" + epoch + "/", function (err) {
            console.log(err);
        });
        const playerString = arrayToString(players);
        const newMapsString = arrayToString2(newMaps);
        let finalMaps = "";
        console.log(newMaps)
        if(newMapsString.length > 0){
            finalMaps = "new maps added: "+newMapsString
        }
        const collectionsString = arrayToString(collections);
        return await interaction.followUp({ content: "found "+mapCount+" maps in lobby https://osu.ppy.sh/community/matches/"+match_id+" \nplayers: "+playerString+"\ncollections: "+collectionsString+"\n"+finalMaps });
    },
};

