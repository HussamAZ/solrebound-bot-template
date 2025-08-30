// 1. Import required libraries
require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const { Connection, PublicKey } = require('@solana/web3.js');
const axios = require('axios');

// 2. Validate essential environment variables
const BOT_TOKEN = process.env.BOT_TOKEN;
const RPC_URL = process.env.RPC_URL;
const PARTNER_REFERRAL_LINK = process.env.PARTNER_REFERRAL_LINK;
const PARTNER_TELEGRAM_ID = process.env.PARTNER_TELEGRAM_ID;
const CMC_API_KEY = process.env.CMC_API_KEY;
const PARTNER_CHANNEL_NAME = process.env.PARTNER_CHANNEL_NAME;

if (!BOT_TOKEN || !RPC_URL || !PARTNER_REFERRAL_LINK || !PARTNER_TELEGRAM_ID || !CMC_API_KEY || !PARTNER_CHANNEL_NAME) {
    console.error('Error: Essential environment variables are missing.');
    process.exit(1);
}

// 3. Initialize Bot and Solana Connection
const bot = new Telegraf(BOT_TOKEN);
const connection = new Connection(RPC_URL, 'confirmed');

// --- Price Fetching and Caching (No changes) ---
let solPriceUSD = null;
let lastPriceFetch = 0;
const CACHE_DURATION = 15 * 60 * 1000;

async function getSolPrice() {
    // ... (This function remains exactly the same as the previous version)
    const now = Date.now();
    if (solPriceUSD && (now - lastPriceFetch < CACHE_DURATION)) { return solPriceUSD; }
    try {
        console.log('Fetching new SOL price from CoinMarketCap...');
        const response = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest', {
            headers: { 'X-CMC_PRO_API_KEY': CMC_API_KEY },
            params: { symbol: 'SOL', convert: 'USD' },
        });
        solPriceUSD = response.data.data.SOL.quote.USD.price;
        lastPriceFetch = now;
        console.log(`New SOL price fetched: $${solPriceUSD}`);
        return solPriceUSD;
    } catch (error) {
        console.error('Could not fetch SOL price:', error.response ? error.response.data : error.message);
        return solPriceUSD || 0;
    }
}

// --- State Management and Keyboard (No changes) ---
const userState = {};
const mainKeyboard = Markup.keyboard([['🔎 Check Wallet'], ['🔗 Claim SOL']]).resize();

// --- Bot Command Handlers ---
bot.start(async (ctx) => {
    await getSolPrice();
    await ctx.reply(
        `👋 Welcome to the official wallet checker for the **${PARTNER_CHANNEL_NAME}**!\n\n` +
        `Use the buttons below to get started.`,
        { parse_mode: 'Markdown', ...mainKeyboard }
    );
});

// --- Bot Action Handlers (Hears) ---
bot.hears('🔎 Check Wallet', (ctx) => {
    userState[ctx.from.id] = 'awaiting_wallet_address';
    ctx.reply('Please send me your Solana wallet address to check.');
});

bot.hears('🔗 Claim SOL', (ctx) => {
    ctx.reply(
        'To securely reclaim your funds, please proceed to our official platform:',
        {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🔒 Reclaim Your SOL on SolRebound.com', url: PARTNER_REFERRAL_LINK }]
                ]
            }
        }
    );
});


// --- Hidden Admin Command (Updated for your API) ---
bot.command('partner_stats', async (ctx) => {
    if (ctx.from.id.toString() !== PARTNER_TELEGRAM_ID) {
        return ctx.reply('🚫 This command is reserved for the channel owner.');
    }

    await ctx.reply('📊 Fetching your latest partner statistics...');

    try {
        const url = new URL(PARTNER_REFERRAL_LINK);
        const refCode = url.searchParams.get('ref');

        if (!refCode) {
            return ctx.reply('Error: Could not extract your referral code from the configured link.');
        }

        const apiUrl = `https://solrebound.com/api/referrals/partner-stats?ref_code=${refCode}`;
        const response = await axios.get(apiUrl);

        if (response.data && response.data.success) {
            const stats = response.data.data;
            await ctx.reply(
                `📈 **Partnership Dashboard for ${PARTNER_CHANNEL_NAME}:**\n\n` +
                `👥 **Total Users:** ${stats.userCount}\n` +
                `🔄 **Total Transactions:** ${stats.transactionCount}\n` +
                `💰 **Total Earnings:** ${stats.totalEarningsSOL.toFixed(4)} SOL`,
                { parse_mode: 'Markdown' }
            );
        }
        // NOTE: According to Sol Rebound docs, the API will send a 404 error, which will be caught by the catch block.
        // The 'else' block here is a fallback in case the API returns a 200 OK with success:false.
        else {
            await ctx.reply(`Could not retrieve stats. The server responded: ${response.data.message || 'Unknown error'}`);
        }
    } catch (error) {
        if (error.response && error.response.status === 404) {
            await ctx.reply(`Could not retrieve stats. The server responded with an error (404 Not Found), which likely means the referral code is invalid.`);
        } else {
            console.error('Failed to fetch partner stats:', error);
            await ctx.reply('An error occurred while trying to fetch your statistics. Please ensure the API is reachable and try again later.');
        }
    }
});


// --- Handle all other text messages ---
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;

    if (userState[userId] === 'awaiting_wallet_address') {
        const walletAddress = ctx.message.text;
        userState[userId] = null; // Reset state immediately

        let publicKey;
        try {
            publicKey = new PublicKey(walletAddress);
        } catch (error) {
            return ctx.reply('🚫 The wallet address you provided is invalid. Please double-check it and try again.');
        }

        await ctx.reply(`🔍 Checking Solana wallet... this may take a few moments.`);

        try {
            const filters = [{ dataSize: 165 }, { memcmp: { offset: 32, bytes: publicKey.toBase58() } }];
            const tokenAccounts = await connection.getParsedProgramAccounts(new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'), { filters });
            const emptyAccounts = tokenAccounts.filter(acc => acc.account.data.parsed.info.tokenAmount.uiAmount === 0);
            const accountsCount = emptyAccounts.length;

            if (accountsCount > 0) {
                const SOL_PER_ACCOUNT = 0.00203928;
                const PLATFORM_FEE_PERCENTAGE = 0.25;
                const grossReclaimableSol = accountsCount * SOL_PER_ACCOUNT;
                const netReclaimableSol = grossReclaimableSol * (1 - PLATFORM_FEE_PERCENTAGE);
                const currentSolPrice = await getSolPrice();
                const reclaimableUSD = netReclaimableSol * currentSolPrice;

                await ctx.reply(
                    `✅ Scan Complete!\n\n` +
                    `📊 We found **${accountsCount}** empty token accounts.\n\n` +
                    `You will receive:\n` +
                    `💰 **~${netReclaimableSol.toFixed(5)} SOL**\n` +
                    `💵 *Equivalent to ~**$${reclaimableUSD.toFixed(2)}***`,
                    {
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '🔗 Claim Now', url: PARTNER_REFERRAL_LINK }]
                            ]
                        }
                    }
                );
            } else {
                await ctx.reply('✅ Your wallet is clean! We found no empty accounts to close.');
            }
        } catch (error) {
            console.error('An error occurred while checking the wallet:', error);
            await ctx.reply('An error occurred while connecting to the Solana network. Please try again later.');
        }

    } else {
        // Fallback for any other text that is not a recognized button
        await ctx.reply("Please use the buttons below to interact with the bot.", mainKeyboard);
    }
});


// --- Launch the bot (No changes) ---
bot.launch().then(() => {
    console.log('✅ Bot is now running...');
    getSolPrice();
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));