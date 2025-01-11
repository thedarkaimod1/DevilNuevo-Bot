const { SlashCommandBuilder } = require('@discordjs/builders');
const firebase = require('../firebase/firebase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('modifybalance')
        .setDescription('Add or remove Moon Coins from any user.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to modify their balance')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('The amount of Moon Coins to add or remove')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Action to perform: "add" or "remove"')
                .setRequired(true)
                .addChoices(
                    { name: 'Add', value: 'add' },
                    { name: 'Remove', value: 'remove' }
                )),

    async execute(interaction) {
        // Verifying if the user has the 'Admin IV' role
        if (!interaction.member.roles.cache.some(role => role.name === 'Admin IV')) {
            return await interaction.reply({
                content: 'You do not have permission to use this command. Only users with the "Admin IV" role can modify balances.',
                ephemeral: true
            });
        }

        try {
            const userId = interaction.options.getUser('user').id;
            const amount = interaction.options.getInteger('amount');
            const action = interaction.options.getString('action');
            const currentBalance = await firebase.getCoins(userId); // Get the user's current balance

            if (action === 'remove' && amount > currentBalance) {
                return await interaction.reply({
                    content: 'The amount to remove exceeds the current balance of the user.',
                    ephemeral: true
                });
            }

            // Add coins if the action is "add"
            if (action === 'add') {
                await firebase.addCoins(userId, amount);
                const newBalance = currentBalance + amount; // Calculate new balance
                await interaction.reply({
                    content: `Successfully added ${amount} Moon Coins to <@${userId}>. Their new balance is ${newBalance} Moon Coins.`,
                    ephemeral: true
                });
            }
            // Remove coins if the action is "remove"
            else if (action === 'remove') {
                await firebase.removeCoins(userId, amount);
                const newBalance = currentBalance - amount; // Calculate new balance after removing
                await interaction.reply({
                    content: `Successfully removed ${amount} Moon Coins from <@${userId}>. Their new balance is ${newBalance} Moon Coins.`,
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Error while modifying balance:', error);
            await interaction.reply({
                content: 'There was an error modifying the balance. Please try again later.',
                ephemeral: true
            });
        }
    }
};
