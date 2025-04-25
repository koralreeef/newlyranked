const { Events, EmbedBuilder } = require('discord.js');
const { Client } = require("osu-web.js");
const { getAccessToken } = require('../helper.js');
const { aimLists, osuUsers } = require('../db/dbObjects.js');
const { lightskyblue } = require("color-name");

const regex = /^\.addmap/gm;

async function buildEmbed(maps) {
    let mapArray = "";
    for (map in maps) {
        current = maps[map];
        const ind = Number(map) + 1
        mapArray = mapArray + ("**" + ind + ": [" + current.artist + " - " + current.title + " [" + current.difficulty + "]](https://osu.ppy.sh/b/" + current.map_id + ")**\n")
    }
    const scoreEmbed = new EmbedBuilder()
        .setDescription(mapArray)
        .setColor(lightskyblue)
    return scoreEmbed;
}

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        const api = new Client(await getAccessToken());
        const msg = message.content;
        const array = msg.split("\n")
        if (regex.test(msg)) {
            if (message.author.id == "109299841519099904" || message.author.id == "450478289107025920") {
                let is_current = 1;
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
                    is_current = 0;
                    collectionName = msg.substring(msg.indexOf("c=") + 2);
                    if (collectionName.includes("D2")) is_current = 2;
                }
                console.log(collectionName)
                const mapset = mapID.split("\n")
                const newMaps = [];
                console.log(mapset)
                if (mapset.length > 0) {
                    for (mapID in mapset) {
                        let beatmap;
                        try {
                            beatmap = await api.beatmaps.getBeatmap(mapset[mapID]);
                        } catch (err) {
                            return message.channel.send("couldnt find beatmap");
                        }

                        try {
                            self = await osuUsers.findOne({ where: { user_id: message.author.id } });
                        } catch (err) {
                            console.log(err)
                            return message.channel.send("use /osuset before registering maps in the collection");
                        }
                        const map = await aimLists.findOne({ where: { map_id: beatmap.id } })
                        if (map) {
                            message.channel.send(mapset[mapID]+" has already been added by " + map.adder + "!");
                        } else {
                            const newMap = await aimLists.create({
                                map_id: mapset[mapID],
                                set_id: beatmap.beatmapset_id,
                                collection: collectionName,
                                adder: self.username,
                                difficulty: beatmap.version,
                                title: beatmap.beatmapset.title,
                                artist: beatmap.beatmapset.artist,
                                creator: beatmap.beatmapset.creator,
                                creatorID: beatmap.beatmapset.user_id,
                                is_current: is_current
                            })
                            newMaps.push(newMap)
                        }
                    }
                    const newmaps = await buildEmbed(newMaps);
                    return await message.channel.send({ content: "added " + mapset.length + " map(s) to " + collectionName + "!\n", embeds: [newmaps] })
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
