const { Events } = require('discord.js');
const { shredMulti, collectionMulti, roleChannel, roleMessage, aimServerID } = require('../config.json');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
		const channel = await client.channels.cache.get(roleChannel);
        const message = await channel.messages.fetch(roleMessage);
        const guild = client.guilds.cache.get(aimServerID);
        const collector = await message.createReactionCollector();
        //console.log(collector)
        collector.on('collect', async (reaction, user) => 
            {
            const use = await client.users.cache.get(user.id)
            const member = await guild.members.fetch(use)
            console.log(`Collected ${reaction.emoji.name} from ${user.username}`)
                if(reaction.emoji.name == "🔥"){
                    member.roles.add(shredMulti).catch(console.error);
                }
                if(reaction.emoji.name == "🎶"){
                    member.roles.add(collectionMulti).catch(console.error);
                }
                if(reaction.emoji.name == "❌"){
                    member.roles.remove(collectionMulti).catch(console.error);
                    member.roles.remove(shredMulti).catch(console.error);
                }
            }
    );
        collector.on('end', collected => {
            console.log(`Collected ${collected.size} items`)
        });
        
    }
}

//https://discordjs.guide/popular-topics/canvas.html#getting-started