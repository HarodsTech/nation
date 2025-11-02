const { Client, GatewayIntentBits } = require('discord.js');

exports.handler = async (event, context) => {
  // Esto NO funcionará bien para un bot constante
  const client = new Client({
    intents: [GatewayIntentBits.Guilds]
  });
  
  await client.login(process.env.DISCORD_TOKEN);
  
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Bot iniciado" })
  };
}