const { Events } = require('discord.js');
const { Client } = require("osu-web.js");
const { getAccessToken } = require('../helper.js')
const regex = /^\.osu \D{1,7}/gm;

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        let msg = message.content;
        /*
        console.log(message.type);
        if(message.type == 19){
        const repliedMessage = await message.fetchReference();
        console.log(repliedMessage.content);
        console.log("found this: "+repliedMessage);
        }
        console.log(message.content);
        */
        if (regex.test(msg)){
            let api = new Client(await getAccessToken());
            let input = msg.substring(5);
            try{
            const user = await api.users.getUser(input, {
                urlParams: {
                  mode: 'osu'
                }
              });
            return message.channel.send("https://osu.ppy.sh/users/"+user.id);
            } catch (err) {
                return message.channel.send("couldnt find user");
            }
        }
    }
}

//https://discordjs.guide/popular-topics/canvas.html#getting-started