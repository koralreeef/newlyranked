const { Events } = require('discord.js');

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
        if (msg === ".help"){
            message.channel.send("https://discord.com/channels/1357179533089968309/1357189509799870535/1357189549930844281");
        }
    }
}

//https://discordjs.guide/popular-topics/canvas.html#getting-started