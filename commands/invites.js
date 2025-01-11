const { getInvites } = require('../firebase/firebase'); // Usamos la función para obtener las invitaciones
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invites')
        .setDescription('Show the invites of a user'),
    async execute(interaction) {
        try {
            const userId = interaction.user.id; // Obtener el ID del usuario
            const invitesCount = await getInvites(userId); // Llamamos a la función para obtener las invitaciones

            if (invitesCount === 0) {
                await interaction.reply("No invites found for your account.");
            } else {
                await interaction.reply(`You have invited ${invitesCount} users.`);
            }
        } catch (error) {
            console.error("Error fetching invites:", error);
            await interaction.reply("There was an error fetching your invites.");
        }
    },
};
