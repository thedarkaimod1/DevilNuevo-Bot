const { SlashCommandBuilder } = require('@discordjs/builders');
const firebase = require('../firebase/firebase');  // Asegúrate de que esta ruta sea correcta
const { getLogsChannelId, setLogsChannelId } = require('../firebase/firebase');  // Puedes importar otras funciones que necesites

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setlogchannel')
        .setDescription('Set the logs channel for the bot.')
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('The channel to set for logs.')
                .setRequired(true)
        ),
    async execute(interaction) {
        const channel = interaction.options.getChannel('channel');
        await setLogsChannelId(channel.id);  // Usamos la función de Firebase para guardar el ID del canal
        return interaction.reply(`Logs channel has been set to: ${channel.name}`);
    },
};
