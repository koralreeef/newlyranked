const { Events, EmbedBuilder } = require('discord.js');
const { aimLists } = require('../db/dbObjects.js');
const regex = /^\.name /gm;

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        const msg = message.content;
        if (regex.test(msg.substring(0, 6))) {
            if (message.author.id === "109299841519099904") {
                let collectionName = msg.substring(6);
                aimLists.update({collection: collectionName}, {where: {is_current: 1}})
                return message.channel.send("updated current collection name to "+collectionName);
            }
        }
    }
}
