const { Events } = require('discord.js');
const { PresenceUpdateStatus } = require('discord.js');
const { ActivityType } = require('discord.js');

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		client.user.setActivity('activity', { type: ActivityType.Custom, name: "custom", state: "watching camp pining hearts s5"});
		client.user.setStatus(PresenceUpdateStatus.DoNotDisturb);
	},
};