const { Events, EmbedBuilder } = require('discord.js');
const { aimLists, aimScores } = require('../db/dbObjects.js');
const { lightskyblue } = require("color-name");

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        const msg = message.content;
        if (message.author.id === "109299841519099904") {
            if (msg.toLowerCase() === ".push") {
                aimLists.update({ is_current: 0}, {where: {is_current: 1}})
                aimScores.update({ is_current: 0}, {where: {is_current: 1}})
                return message.channel.send("pushed current collection to legacy");
            }
        }
    }
}
