const { Events } = require('discord.js');
const { PresenceUpdateStatus } = require('discord.js');
const { ActivityType } = require('discord.js');
const { client_cred } = require('../helper.js');

setInterval(async () => {
	await client_cred();
	console.log("hourly token refreshed!")
	}, 3600001);
	
module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		require('events').EventEmitter.defaultMaxListeners = 15;
		client.user.setActivity('activity', { type: ActivityType.Custom, name: "custom", state: "watching camp pining hearts s5"});
		client.user.setStatus(PresenceUpdateStatus.DoNotDisturb);
		await client_cred();
		console.log("new token set!");
	},
};