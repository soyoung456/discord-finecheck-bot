const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.send('Bot is running safely!');
});

app.listen(PORT, () => {
    console.log(`Render 포트 감지 서버가 ${PORT}번에서 작동 중입니다.`);
});

require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
    ]
});

// 채널 이름 추가
const TARGET_CHANNELS = '💸벌금-관리';

const commands = [
    new SlashCommandBuilder()
        .setName('벌금췍')
        .setDescription('채널을 확인하여 ✅ 이모지를 누르지 않은 멤버를 확인합니다.')
].map(command => command.toJSON());

client.once('ready', async () => {
    console.log(`벌금췍 준비 완료! (${client.user.tag})`);

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        console.log('슬래시 명령어 등록을 시작합니다.');
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        console.log('슬래시 명령어가 성공적으로 등록되었습니다! /벌금췍 사용 가능');
    } catch (error) {
        console.error('명령어 등록 중 오류 발생:', error);
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === '벌금췍') {
        await interaction.deferReply();

        // 현재 명령어를 입력한 서버 내에서 감시 대상 채널이 있는지 찾기
        const targetChannel = interaction.guild.channels.cache.find(c => c.name === TARGET_CHANNEL);

        if (!targetChannel) {
            return interaction.editReply(`채널(${TARGET_CHANNEL})을 찾을 수 없습니다. 채널 이름을 확인해 주세요!`);
        }

        try {
            const messages = await targetChannel.messages.fetch({ limit: 100 });
            const unpaidUsers = new Set();

            for (const [msgId, msg] of messages) {
                if (msg.author.bot) continue;

                const targetUser = msg.mentions.users.first();
                if (!targetUser) continue;

                const reaction = msg.reactions.cache.get('✅');
                let hasReacted = false;

                if (reaction) {
                    const usersWhoReacted = await reaction.users.fetch();
                    hasReacted = usersWhoReacted.has(targetUser.id);
                }

                if (!hasReacted) {
                    const member = msg.guild.members.cache.get(targetUser.id);
                    const displayName = member ? member.displayName : targetUser.username;
                    unpaidUsers.add(displayName);
                }
            }

            if (unpaidUsers.size === 0) {
                await interaction.editReply(`전원 입금 완료!`);
            } else {
                const nameList = Array.from(unpaidUsers).join(', ');
                await interaction.editReply(`**미납 안내:** ${nameList} 부원은 벌금 입금 후 ✅ 이모지를 눌러주세요!`);
            }

        } catch (error) {
            console.error('오류 발생:', error);
            await interaction.editReply('봇 사용 중 오류가 발생했습니다.');
        }
    }
});

client.login(process.env.DISCORD_TOKEN);