const { Events } = require('discord.js');
const { PresenceUpdateStatus } = require('discord.js');
const { currentD1Collection, currentD2Collection } = require('../config.json');
const { ActivityType } = require('discord.js');
const { client_cred } = require('../helper.js');
const { osuUsers, aimLists, aimScores } = require('../db/dbObjects.js');
const { CronJob } = require ('cron');
const fs = require("fs");

const Sequelize = require('sequelize');
const Op = Sequelize.Op;

setInterval(async () => {
	await client_cred();
	console.log("hourly token refreshed!")
	}, 3600001);
	
function getCurrentFilenames() {
	console.log("\nCurrent filenames:");
	fs.readdirSync(__dirname).forEach(file => {
		console.log(file);
	});
}

function copyDB () {
	const epoch = Date.now();
	fs.copyFile("database.sqlite", "./db/backups/"+epoch+".sqlite", (err) => {
		if (err) {
			console.log("Error Found:", err);
		}
		else {  

		}
	});
}
module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		require('events').EventEmitter.defaultMaxListeners = 15;
		client.user.setActivity('activity', { type: ActivityType.Custom, name: "custom", state: "watching camp pining hearts s5"});
		client.user.setStatus(PresenceUpdateStatus.DoNotDisturb);
		await client_cred();
		console.log("new token set!");
		const scheduleExpression = '0 */24 * * *'; // Run once every eight hours in prod
		//const scheduleExpressionMinute = '* * * * *'; // Run once every minute for testing
		/*
		const oldMaps = await aimLists.findAll({ where: { [Op.or]: [{collection: currentD1Collection, collection: currentD2Collection}]}})
		for(maps in oldMaps){
			console.log(oldMaps.title)
		}
		*/
		const job = new CronJob(scheduleExpression, copyDB); // change to scheduleExpressionMinute for testing

		job.start();
	},
};