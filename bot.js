const { Client, Intents, Collection } = require('discord.js');
const { token, clientId, guildId } = require('./config/config.json');
const fs = require('fs');
const path = require('path');
const firebase = require('./firebase/firebase');  // Assuming this file contains Firebase functions

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MEMBERS,  // Necessary for detecting new members
        Intents.FLAGS.MESSAGE_CONTENT
    ],
    partials: ['MESSAGE', 'CHANNEL', 'REACTION']
});

client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Log to know if commands are loading
console.log(`Loading commands from folder: ${commandsPath}`);
if (commandFiles.length === 0) {
    console.warn('Warning! No commands found in the "commands" folder.');
} else {
    console.log(`Commands found: ${commandFiles.join(', ')}`);
}

// Load and register commands (excluding unwanted duplicates)
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    // Ensure only one 'invites' command is loaded
    if (command.data.name === 'invites' && client.commands.has('invites')) {
        console.log('Duplicate "invites" command detected. Skipping this one.');
        continue; // Skip the duplicate invites command
    }

    // Add valid command to the collection
    client.commands.set(command.data.name, command);
    console.log(`Command loaded: ${command.data.name}`);
}

// Register slash commands on Discord
client.once('ready', async () => {
    try {
        console.log(`Bot logged in as ${client.user.tag}`);
        // Register commands in Discord, excluding the ones we don't need
        await client.application.commands.set(client.commands.map(command => command.data));
        console.log('Commands registered successfully on Discord.');

        // Verify registered commands
        const registeredCommands = await client.application.commands.fetch();
        console.log(`Commands currently registered on Discord: ${registeredCommands.map(cmd => cmd.name).join(', ')}`);
    } catch (error) {
        console.error('Error registering commands:', error);
    }
});

// Detect when a member joins the server
client.on('guildMemberAdd', async (member) => {
    try {
        console.log(`New member detected: ${member.user.tag}`);
        
        // Try to get the inviter
        const inviterId = await getInviterId(member);
        if (inviterId) {
            console.log(`Inviter found: ${inviterId}`);
            
            // Check if the inviter has earned coins in the last 24 hours
            const lastInviteDate = await firebase.getLastInviteDate(inviterId);
            const currentTime = Date.now();
            const oneDay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
            
            if (lastInviteDate && currentTime - lastInviteDate < oneDay) {
                console.log('The inviter has already earned coins recently. No more coins will be awarded.');
                return; // No more coins are awarded if earned within the last 24 hours
            }

            // Register the invitation and assign the coin
            await firebase.trackInvite(inviterId, member.id);
            await firebase.addCoins(inviterId, 1);
            console.log(`Moon Coin assigned to ${inviterId}`);
            
            // Update the last invite date
            await firebase.updateLastInviteDate(inviterId, currentTime);
            
            // Get the inviter's Moon Coin balance
            const inviterCoins = await firebase.getCoins(inviterId);

            // Send a notification to the inviter with their new coin balance
            const inviter = await client.users.fetch(inviterId);
            await inviter.send(`Congratulations! You have invited ${member.user.tag}. You have earned 1 Moon Coin. Your current balance is: ${inviterCoins} Moon Coins.`);
        } else {
            console.log('Could not find the inviter.');
        }
    } catch (error) {
        console.error('Error processing the member:', error);
    }
});

// Function to get the inviter's ID
async function getInviterId(member) {
    try {
        // Check server invites
        const fetchInvites = await member.guild.invites.fetch();
        for (const invite of fetchInvites.values()) {
            if (invite.uses > 0) {
                return invite.inviter.id;
            }
        }
        return null;
    } catch (error) {
        console.error('Error getting invites:', error);
        return null;
    }
}

// Function to add coins to a user in Firebase
async function addCoins(userId, amount) {
    const userRef = firebase.db.ref('users/' + userId);
    const snapshot = await userRef.once('value');
    const currentCoins = snapshot.val()?.coins || 0;
    await userRef.update({ coins: currentCoins + amount });
}

// Function to remove coins from a user in Firebase
async function removeCoins(userId, amount) {
    const userRef = firebase.db.ref('users/' + userId);
    const snapshot = await userRef.once('value');
    const currentCoins = snapshot.val()?.coins || 0;
    await userRef.update({ coins: Math.max(0, currentCoins - amount) });
}

// Function to get the last invite date
async function getLastInviteDate(userId) {
    const userRef = firebase.db.ref('users/' + userId);
    const snapshot = await userRef.once('value');
    return snapshot.val()?.lastInviteDate || null;
}

// Function to update the last invite date
async function updateLastInviteDate(userId, date) {
    const userRef = firebase.db.ref('users/' + userId);
    await userRef.update({ lastInviteDate: date });
}

// Handling interactions (commands)
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) {
        console.error(`Command not found: ${interaction.commandName}`);
        await interaction.reply({
            content: `The command \`/${interaction.commandName}\` is not registered or cannot be found.`,
            ephemeral: true
        });
        return;
    }

    try {
        console.log(`Executing the command: ${interaction.commandName}`);
        await command.execute(interaction);
    } catch (error) {
        console.error(`Error executing command: ${interaction.commandName}`);
        console.error(error);
        await interaction.reply({
            content: 'There was an error executing this command.',
            ephemeral: true
        });
    }
});

// Login to the bot
client.login(token)
    .then(() => {
        console.log('Bot successfully connected.');
    })
    .catch((error) => {
        console.error('Error connecting the bot:', error);
    });

// Monitoring bot disconnects
client.on('disconnect', () => {
    console.log('The bot has disconnected from the Discord server.');
});

client.on('reconnecting', () => {
    console.log('The bot is reconnecting to the Discord server...');
});

client.on('error', (error) => {
    console.error('Bot error:', error);
});
