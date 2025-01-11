const { SlashCommandBuilder } = require('@discordjs/builders');
const firebase = require('../firebase/firebase');
const { MessageEmbed } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Shows the available items for purchase using Moon Coins.')
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Choose an action')
                .setRequired(true)
                .addChoices(
                    { name: 'View', value: 'view' },
                    { name: 'Buy', value: 'buy' }
                ))
        .addStringOption(option =>
            option.setName('item')
                .setDescription('Item to purchase')
                .setRequired(false)
                .addChoices(
                    { name: 'TikTok Video', value: 'tiktok' },
                    { name: 'Xbox Game Pass', value: 'xbox' },
                    { name: 'NFA to FA Method', value: 'nfa_to_fa' },
                    { name: 'Nitro Gen', value: 'nitro' },
                    { name: 'V-Bucks Gen', value: 'vbucks' },
                    { name: 'Moon GOLD', value: 'moon_gold' }
                ))
        .addIntegerOption(option =>
            option.setName('quantity')
                .setDescription('Quantity of the item to purchase')
                .setRequired(false)
        ),

    async execute(interaction) {
        const action = interaction.options.getString('action');
        const item = interaction.options.getString('item');
        const quantity = interaction.options.getInteger('quantity') || 1;

        const userId = interaction.user.id;
        const userCoins = await firebase.getCoins(userId);

        const items = {
            tiktok: { name: 'TikTok Video', price: 10 },
            xbox: { name: 'Xbox Game Pass', price: 10 },
            nfa_to_fa: { name: 'NFA to FA Method', price: 10 },
            nitro: { name: 'Nitro Gen', price: 10 },
            vbucks: { name: 'V-Bucks Gen', price: 10 },
            moon_gold: { name: 'Moon GOLD', price: 15 },
        };

        if (action === 'view') {
            const embed = new MessageEmbed()
                .setColor('#FFCC00')
                .setTitle('Available Items in Shop')
                .setDescription('Here are the items you can purchase using Moon Coins:')
                .addFields(
                    { name: 'TikTok Video', value: 'Price: 10 Moon Coins', inline: true },
                    { name: 'Xbox Game Pass', value: 'Price: 10 Moon Coins', inline: true },
                    { name: 'NFA to FA Method', value: 'Price: 10 Moon Coins', inline: true },
                    { name: 'Nitro Gen', value: 'Price: 10 Moon Coins', inline: true },
                    { name: 'V-Bucks Gen', value: 'Price: 10 Moon Coins', inline: true },
                    { name: 'Moon GOLD', value: 'Price: 15 Moon Coins', inline: true }
                )
                .setFooter('Use `/shop buy [item] [quantity]` to purchase.');

            await interaction.reply({ embeds: [embed] });
        } else if (action === 'buy') {
            if (!item || !items[item]) {
                return interaction.reply({ content: 'Invalid item selected.', ephemeral: true });
            }

            const totalPrice = items[item].price * quantity;

            if (userCoins < totalPrice) {
                return interaction.reply({ content: `You do not have enough Moon Coins to buy ${quantity} ${items[item].name}(s). You need ${totalPrice} Moon Coins.`, ephemeral: true });
            }

            // Deduct the coins
            await firebase.removeCoins(userId, totalPrice);

            // Log the purchase to the logs channel
            const logsChannelId = await firebase.getLogsChannelId();
            const logsChannel = interaction.guild.channels.cache.get(logsChannelId);

            if (logsChannel) {
                const logEmbed = new MessageEmbed()
                    .setColor('#FF9900')
                    .setTitle('Purchase Made')
                    .setDescription(`${interaction.user.tag} purchased **${quantity} ${items[item].name}(s)** for **${totalPrice} Moon Coins**.`)
                    .addField('Item', items[item].name, true)
                    .addField('Quantity', quantity.toString(), true)
                    .addField('Total Price', `${totalPrice} Moon Coins`, true)
                    .setTimestamp();

                logsChannel.send({ embeds: [logEmbed] });
            }

            // Confirm the purchase
            await interaction.reply({ content: `You have successfully purchased **${quantity} ${items[item].name}(s)** for **${totalPrice} Moon Coins**. Check the logs for details!` });
        }
    }
};
