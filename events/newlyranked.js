const fs = require("fs");
const { Events, AttachmentBuilder } = require("discord.js");
const { AccessToken, targetThread } = require("../config.json");
const { Client, LegacyClient, calcModStat } = require("osu-web.js");
const { getAccessToken } = require("../helper.js");
const { pipeline } = require('node:stream/promises');
const { hr, dt } = calcModStat;
const undici = require('undici');
const legacyApi = new LegacyClient(AccessToken);

function sleep(delay) {
  var start = new Date().getTime();
  while (new Date().getTime() < start + delay);
}

function getLength(s) {
  minutes = Math.trunc(s / 60);
  seconds = Math.trunc(s - minutes * 60);
  if (seconds < 10) return minutes + ":0" + seconds;
  return minutes + ":" + seconds;
}

function arrayExists(array) {
  if (Array.isArray(array) && array.length) return true;
  return false;
}

function onlyUnique(value, index, array) {
  return array.indexOf(value) === index;
}

function findTopDiff(beatmaps) {
  let topDiff = 0;
  let topDiffIndex = 0;
  for (let i = 0; i < beatmaps.length; i++) {
    if (beatmaps[i].difficultyrating > topDiff) {
      topDiff = beatmaps[i].difficultyrating;
      topDiffIndex = i;
    }
  }
  return topDiffIndex;
}

function findDT(beatmaps) {
  let diffMap = new Map();
  for (let i = 0; i < beatmaps.length; i++) {
    if (
      beatmaps[i].difficultyrating >= 4.3 &&
      beatmaps[i].difficultyrating.toFixed(2) <= 5.49
    ) {
      diffMap.set(beatmaps[i].difficultyrating, i);
    }
  }
  // how do i read this
  // .entries = grab all map key and value pairs
  // .sort(x, y) = do something with both key and value pairs
  // => b[0] - a[0],
  diffMap = new Map([...diffMap.entries()].sort((a, b) => b[0] - a[0]));
  console.log(diffMap);
  const indexes = [...diffMap.values()];
  return indexes;
}

const downloadFile = async (url, beatmapID) => {
  const response = await undici.request("https:"+url);
  // TODO: You may want to check if response.statusCode is 200 (OK).
  const targetFile = fs.createWriteStream('./samples/'+beatmapID+'.mp3');
  await pipeline(response.body, targetFile);
  console.log('File downloaded!');
}

const start = async (id) => {
    let api = new Client(await getAccessToken());
    let beatmap = await api.beatmaps.getBeatmap(id);
    await downloadFile(beatmap.beatmapset.preview_url, id);
    console.log('./samples/'+id+'.mp3')
    return './samples/'+id+'.mp3';
}

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    const targetChannel = client.channels.cache.get(targetThread);

    setInterval(async () => {
      // 3 (* actual beatmaps) api call(s) (+however many dtable beatmaps) every 60s
      // HOW TO FIX THE DOUBLEPOSTING
      const ms = Date.now() - 59 * 1000;
      const date = new Date(ms);
      let firstMap = true;
      const startTimestamp = Math.floor(Date.now() / 1000);
      try {
        // initial search
        const beatmaps = await legacyApi.getBeatmaps({
          m: "0",
          since: date,
          //s: 2194372,
          limit: 100,
        });
        if (arrayExists(beatmaps)) {
          // sort into unique beatmapset ids
          const beatmapArray = [];
          for (let i = 0; i < beatmaps.length; i++) {
            if(beatmaps[i].approved == "loved" || beatmaps[i].approved == "ranked")
            beatmapArray[i] = beatmaps[i].beatmapset_id; 
          }

          const sortedArray = beatmapArray.filter(onlyUnique);
          let extraString = "";
          for (let i = 0; i < sortedArray.length; i++) {

            const beatmaps = await legacyApi.getBeatmaps({
              m: "0",
              s: sortedArray[i],
              limit: 100,
            });
            const hrBeatmaps = await legacyApi.getBeatmaps({
              m: "0",
              s: sortedArray[i],
              limit: 100,
              mods: ["HR"],
            });
            const topDiffIndex = findTopDiff(beatmaps);
            const dtIndexes = findDT(beatmaps);
            let dtString = "",
              dtString2 = "",
              bpmString = "",
              lengthString = "";
            let dtLength = 0;
            let nmString = "";
            // console.log(beatmaps[topDiffIndex]);
            const mapNM = beatmaps[topDiffIndex];
            const mapHR = hrBeatmaps[topDiffIndex];
            console.log(sortedArray[i]);
            let filePath = await start(mapNM.beatmap_id);
            let attachment = new AttachmentBuilder(filePath);   
            if (arrayExists(dtIndexes)) {
              bpmString = "/" + dt.bpm(mapNM.bpm);
              lengthString = "/" + getLength(dt.length(mapNM.hit_length));
            }
            console.log(
              "new map: https://osu.ppy.sh/b/" +
                mapNM.beatmap_id +
                " SR: " +
                mapNM.difficultyrating.toFixed(2),
            );
            // -> \\\* <- LOOKS LIKE SHIT
            // processes nm/hr stats if star rating > 5.5 else if sr > 4.3 spits out dt
            if (mapNM.difficultyrating.toFixed(2) > 5.49) {
              nmString =
                "A new beatmap by **" +
                mapNM.creator +
                "** just got " +
                mapNM.approved +
                " <t:" +
                startTimestamp +
                ":R>!\n" +
                mapNM.version +
                ": " +
                mapNM.difficultyrating.toFixed(2) +
                "\\*, aim/speed SR: " +
                mapNM.diff_aim.toFixed(2) +
                "\\*/" +
                mapNM.diff_speed.toFixed(2) +
                "\\*\nhr SR: " +
                mapHR.difficultyrating.toFixed(2) +
                "\\*, aim/speed SR: " +
                mapHR.diff_aim.toFixed(2) +
                "\\*/" +
                mapHR.diff_speed.toFixed(2) +
                "\\*\ncs: " +
                mapNM.diff_size.toFixed(2) +
                "/" +
                hr.cs(mapHR.diff_size).toFixed(2) +
                ", ar: " +
                mapNM.diff_approach +
                ", bpm: " +
                mapNM.bpm +
                bpmString +
                ", length: " +
                getLength(mapNM.hit_length) +
                lengthString;
              firstMap = false;
            }

            // new dt map check
            // jnxvzxvxzcv NICE VARIABLES
            if (arrayExists(dtIndexes)) {
              if (firstMap == false) extraString = "dtable diffs: \n";
              for (let i = 0; i < dtIndexes.length; i++) {
                const dtBeatmaps = await legacyApi.getBeatmaps({
                  m: "0",
                  // Jesus christ
                  b: beatmaps[dtIndexes[i]].beatmap_id,
                  limit: 1,
                  mods: ["DT"],
                });
                const mapDT = dtBeatmaps[0];
                const baseAR = mapDT.diff_approach;
                dtBPM = dt.bpm(mapDT.bpm);
                dtLength = dt.length(mapDT.hit_length);
                // its alright actually
                if (firstMap == true) {
                  dtString =
                    "A new DTable beatmap by **" +
                    mapDT.creator +
                    "** just got " +
                    mapDT.approved +
                    " <t:" +
                    startTimestamp +
                    ":R>!\nar: " +
                    baseAR +
                    "/" +
                    dt.ar(baseAR).toFixed(2) +
                    ", bpm: " +
                    dt.bpm(mapDT.bpm) +
                    ", length: " +
                    getLength(dtLength) +
                    "\n" +
                    mapDT.version +
                    ": " +
                    mapDT.difficultyrating.toFixed(2) +
                    "\\*, aim/speed SR: " +
                    mapDT.diff_aim.toFixed(2) +
                    "\\*/" +
                    mapDT.diff_speed.toFixed(2) +
                    "\\*\n";
                  firstMap = false;
                } else {
                  dtString2 +=
                    mapDT.version +
                    ": " +
                    mapDT.difficultyrating.toFixed(2) +
                    "\\*, ar: " +
                    dt.ar(baseAR).toFixed(2) +
                    ", stats: " +
                    mapDT.diff_aim.toFixed(2) +
                    "\\*/" +
                    mapDT.diff_speed.toFixed(2) +
                    "\\*\n";
                }
              }
              // Lmao
              targetChannel.send({
                content: nmString +
                  "\n" +
                  dtString +
                  extraString +
                  dtString2 +
                  "\ndirect download: https:///beatconnect.io/b/" + mapNM.beatmapset_id + 
                  "\n" + "https://osu.ppy.sh/b/" +
                  mapNM.beatmap_id,
                  files: [attachment]
            });
            } else if (mapNM.difficultyrating.toFixed(2) > 5.4) {
              targetChannel.send({
                content: nmString + "\ndirect download: https:///beatconnect.io/b/"+mapNM.beatmapset_id+"\n" + "https://osu.ppy.sh/b/" + mapNM.beatmap_id,
                files: [attachment]
              });
            }
            firstMap = true;
            sleep(3000)
          }
        }
      } catch (error) {
          console.log(error);
          return targetChannel.send("couldn't process new map or my internet died");
      }
    }, 60001);

    console.log(`${client.user.tag} connected to api`);
  },
};
