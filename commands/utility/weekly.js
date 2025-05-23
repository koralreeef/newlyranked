const { AttachmentBuilder, SlashCommandBuilder } = require('discord.js');
const { LegacyClient } = require('osu-web.js');
const { AccessToken } = require('../../config.json');
const legacyApi = new LegacyClient(AccessToken);
  
function addDays(theDate, days) {
    return new Date(theDate.getTime() + days*24*60*60*1000);
}

module.exports = {
    cooldown: 5,
	data: new SlashCommandBuilder()
		.setName('weekly')
		.setDescription('provides a list of the newest ranked beatmaps (std only) within the last week. (this doesnt work)')
        .addNumberOption(option =>
            option.setName('minimum')
            .setDescription('set minimum sr range')
            .setMinValue(0.01)
            .setRequired(true))
        .addNumberOption(option =>
            option.setName('maximum')
            .setDescription('set maximum sr range (cannot be lower than minimum set value)')
            .setMaxValue(11.00)
            .setRequired(true)),

	async execute(interaction) {
        let lastWeek = addDays(new Date(), -7);
        let min = interaction.options.getNumber('minimum');
        let max = interaction.options.getNumber('maximum');
        if(min > max || max < min)
            return await interaction.reply('re-enter sr range (min > mix or max < min detected)');

        interaction.deferReply();
        let textfile = "";
        let successfulMaps = 0;
        const beatmaps = await legacyApi.getBeatmaps({
            m: "0",
            a: "0",
            since: lastWeek,
            limit: 500
          });

        for(let i = 0; i < beatmaps.length; i++)
        {
            if(beatmaps[i].difficultyrating > min && beatmaps[i].difficultyrating < max && beatmaps[i].approved == "ranked")
            {
                //console.log("id:  "+beatmaps[i].beatmap_id+", sr: "+beatmaps[i].difficultyrating+", mapper: "+beatmaps[i].mode+", status: "+beatmaps[i].approved);
                textfile += "id:  "+beatmaps[i].beatmap_id+",  SR:  "
                +beatmaps[i].difficultyrating.toFixed(2)+",  aimSR:  "
                +beatmaps[i].diff_aim.toFixed(2)+",  bpm:  "
                +beatmaps[i].bpm+",  mapper:  "
                +beatmaps[i].creator+"\n";
                successfulMaps++;
            }
        }

        if(textfile != ""){
            if(successfulMaps > 30){
                const attachment = new AttachmentBuilder(Buffer.from(textfile), { name: 'weeklymaps.txt' })
                await interaction.editReply({ files: [attachment] });
                return await interaction.followUp("processed "+beatmaps.length+" maps for this week, with "+successfulMaps+" fitting your search");
            }
        await interaction.editReply(textfile);
        return await interaction.followUp("processed "+beatmaps.length+" maps for this week, with "+successfulMaps+" fitting your search");
        }
        else {
        await interaction.editReply("found no maps for your search. maybe change the sr range?");
        }
	},
};

//todo: settings for ranked, loved, qualified, aim difficulty