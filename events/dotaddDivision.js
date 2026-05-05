const { Events, EmbedBuilder } = require('discord.js');
const { Client } = require("osu-web.js");
const { getAccessToken } = require('../helper.js');
const { currentSeasons, osuUsers } = require('../db/dbObjects.js');
const { lightskyblue } = require("color-name");

const div1 = /^\.addDivision1/gm;
const div2 = /^\.addDivision2/gm;

async function buildEmbed(maps) {
    let mapArray = "";

    for (map in maps) {
        let mods = "";
        current = maps[map];
        if (current.required_mods == 1) mods = " +HR"
        if (current.required_mods == 2) mods = " +DT"
        if (current.required_mods == 3) mods = " +DTHR"
        const ind = Number(map) + 1
        mapArray = mapArray + ("**" + ind + ": [" + current.artist + " - " + current.title + " [" + current.difficulty + "]](https://osu.ppy.sh/b/" + current.map_id + ")" + mods + " **\n")
    }
    const scoreEmbed = new EmbedBuilder()
        .setDescription(mapArray)
        .setColor(lightskyblue)
    return scoreEmbed;
}

function getLength(s) {
    minutes = Math.trunc(s / 60);
    seconds = Math.trunc(s - minutes * 60);
    if (seconds < 10) return minutes + ":0" + seconds;
    return minutes + ":" + seconds;
}

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        const api = new Client(await getAccessToken());
        const msg = message.content;
        const array = msg.split("\n")
        if (div1.test(msg) || div2.test(msg)) {
            if (message.author.id == "109299841519099904" || message.author.id == "450478289107025920") {
                let division = 0;
                if (msg.includes('addDivision1')){division = 1};
                if (msg.includes('addDivision2')){division = 2};
                console.log(division);
                let collectionStr = 0
                let mapID = "";
                if (msg.indexOf("b=") == -1) {
                    const self = await osuUsers.findOne({ where: { user_id: message.author.id } });
                    if (self) {
                        username = self.username
                    } else {
                        return await message.channel.send("use /osuset first")
                    }
                    collectionStr = msg.length;
                } else {
                    mapID = msg.substring(msg.indexOf("b=") + 2, msg.indexOf("c=") - 1)
                }
                let collectionName = "";
                if (msg.indexOf("c=") > 0) {
                    collectionName = msg.substring(msg.indexOf("c=") + 2);
                }
                console.log(collectionName)
                const mapset = mapID.split("\n")
                const newMaps = [];
                let time = 0;
                let difficulty = 0;
                console.log(mapset)
                if (mapset.length > 0) {
                    for (mapID in mapset) {
                        let requiredMods = 0;
                        let current = mapset[mapID]
                        if (current.includes(" 3")) {
                            current = current.substring(0, current.indexOf(" 3"))
                            requiredMods = 3;
                        }
                        else if (current.includes(" 2")) {
                            current = current.substring(0, current.indexOf(" 2"))
                            requiredMods = 2;
                        }
                        else if (current.includes(" 1")) {
                            current = current.substring(0, current.indexOf(" 1"))
                            requiredMods = 1
                        }
                        //hr = 1, dt = 2, dthr = 3
                        let beatmap;
                        try {
                            beatmap = await api.beatmaps.getBeatmap(current);
                        } catch (err) {
                            return message.channel.send("couldnt find beatmap");
                        }

                        try {
                            self = await osuUsers.findOne({ where: { user_id: message.author.id } });
                        } catch (err) {
                            console.log(err)
                            return message.channel.send("use /osuset before registering maps in the collection");
                        }
                        console.log(beatmap.id);
                        if(!beatmap.id) return;
                        const map = await currentSeasons.findOne({ where: { map_id: beatmap.id } })
                        if (map) {
                            if (map.collection == collectionName) {
                                message.channel.send(current + " has already been added by " + map.adder + "!");
                            } else {
                                map.collection = collectionName;
                                map.required_mods = requiredMods;
                                map.save();
                            }
                            newMaps.push(map)
                        } else {
                            const newMap = await currentSeasons.create({
                                map_id: current.trim(),
                                set_id: beatmap.beatmapset_id,
                                collection: collectionName,
                                adder: self.username,
                                difficulty: beatmap.version,
                                title: beatmap.beatmapset.title,
                                artist: beatmap.beatmapset.artist,
                                creator: beatmap.beatmapset.creator,
                                creatorID: beatmap.beatmapset.user_id,
                                required_mods: requiredMods,
                                division: division,
                            })
                            newMaps.push(newMap)
                            if (requiredMods > 1) {
                                time = time + Number((beatmap.hit_length * 0.5).toFixed(0))
                            } else {
                                time = time + beatmap.hit_length
                            }
                            difficulty = difficulty + beatmap.difficulty_rating
                        }
                    }
                    const newmaps = await buildEmbed(newMaps);
                    difficulty = (difficulty / mapset.length).toFixed(2)
                    return await message.channel.send({ content: "added " + mapset.length + " map(s) to " + collectionName + "!\ntotal length: " + getLength(time) + "\naverage sr: " + difficulty + "*", embeds: [newmaps] })
                } else {
                    return message.channel.send("wheres the maps buddy")
                }
            } else {
                return message.channel.send("only koral and ruyu can add maps for now sorry");
            }
        }
    }
}
//idk how to hook it up but we'll live
