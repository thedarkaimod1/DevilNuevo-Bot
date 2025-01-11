const { SlashCommandBuilder } = require('@discordjs/builders');
const firebase = require('../firebase/firebase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check your current Moon Coins balance.'),

    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const balance = await firebase.getCoins(userId);
            
            // Respondemos con el balance
            await interaction.reply({
                content: `Your current Moon Coins balance is: ${balance} Moon Coins.`,
                ephemeral: true  // Solo visible para el usuario que ejecutó el comando
            });
        } catch (error) {
            console.error('Error al obtener el balance:', error);
            await interaction.reply({
                content: 'There was an error while fetching your balance. Please try again later.',
                ephemeral: true
            });
        }
    }
};
