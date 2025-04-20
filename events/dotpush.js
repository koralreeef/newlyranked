const { Events, EmbedBuilder } = require('discord.js');
const { aimLists, aimScores } = require('../db/dbObjects.js');
const regex = /^\.push/gm;

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        const msg = message.content;
        if (message.author.id === "109299841519099904") {
            if (regex.test(msg.substring(0, 6))) {
                const collectionName = msg.substring(6);
                aimLists.update({ is_current: 0}, {where: {is_current: 1, collection: collectionName}})
                aimScores.update({ is_current: 0}, {where: {is_current: 1, collection: collectionName}})
                return message.channel.send("pushed current collection to legacy");
            }
        }
    }
}
