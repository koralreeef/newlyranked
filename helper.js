const { Collection } = require('discord.js');
const { Readable } = require('stream');
const { finished } = require('stream/promises');
const { Users } = require('./db/dbObjects.js')
const path = require("path");
const currency = new Collection();
const fs = require("fs");

var commonSR = 60;
var SSR = 90;
let beatmapID = 0;

function getLifetime(id) {
	const user = currency.get(id);
	return user ? user.lifetime : 0;
}

async function addBalance(id, amount) {
	const user = currency.get(id);

	if (user) {
		user.balance += Number(amount);
        user.lifetime += Number(amount);
		return user.save();
	}

	const newUser = await Users.create({ user_id: id, balance: amount, lifetime: amount });
	currency.set(id, newUser);
	return newUser;
}

function getBalance(id) {
	const user = currency.get(id);
	return user ? user.balance : 0;
}

function getRandomInt(max) {
	return Math.floor(Math.random() * max);
  }

function wipeBalance(id) {
	const user = currency.get(id);
    user.balance = 0;
	return user.save()
}   

function setBeatmapID(id) {
	beatmapID = id;
}   

function getBeatmapID(id) {
	return beatmapID;
}   

const downloadFile = (async (url, fileName) => {
    const res = await fetch(url);

    const destination = path.resolve("./images", fileName);
    if (!fs.existsSync("./images")) fs.mkdirSync("./images"); //make downloads directory if none
    const fileStream = fs.createWriteStream(destination, { flags: 'wx' });
    await finished(Readable.fromWeb(res.body).pipe(fileStream));
    }
);

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { currency, commonSR, SSR, 
				   getLifetime, getRandomInt, 
				   addBalance, wipeBalance, getBalance, 
				   getBeatmapID, setBeatmapID,
				   downloadFile, sleep };