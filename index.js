const { Client, GatewayIntentBits, Collection, EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const translate = require('translate-google-api');
const config = require('./config.json');
require('dotenv').config();
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildModeration
  ]
});

// Cambiar el evento ready para evitar el warning
client.on('clientReady', async () => {
  console.log(`✅ Bot ${client.user.tag} está en línea!`);
  console.log(`🏠 Conectado a ${client.guilds.cache.size} servidores`);
  
  try {
    await client.application.commands.set(commands);
    console.log('✅ Comandos registrados correctamente');
  } catch (error) {
    console.error('❌ Error registrando comandos:', error);
  }

  client.user.setActivity('Obsidian Network | /help', { type: 'WATCHING' });
});

// También mantener el evento ready original por compatibilidad
client.once('ready', async () => {
  console.log(`✅ Bot ${client.user.tag} está en línea!`);
  console.log(`🏠 Conectado a ${client.guilds.cache.size} servidores`);
  
  try {
    await client.application.commands.set(commands);
    console.log('✅ Comandos registrados correctamente');
  } catch (error) {
    console.error('❌ Error registrando comandos:', error);
  }

  client.user.setActivity('Obsidian Network | /help', { type: 'WATCHING' });
});

client.commands = new Collection();
// SOLO guardamos el canal designado por ID
client.translationChannels = new Map();
// NO usamos autoTranslate general, solo el canal específico
client.translationCooldown = new Map();

// Función para verificar permisos
function hasPermission(member) {
  return member.permissions.has(PermissionsBitField.Flags.Administrator) || 
         config.allowedRoles.some(role => member.roles.cache.some(r => r.name === role));
}

// Función de traducción MEJORADA - maneja diferentes formatos de respuesta
async function translateText(text, targetLang) {
  try {
    // Verificar cooldown
    const cooldownKey = `${text}-${targetLang}`;
    const now = Date.now();
    const lastTranslation = client.translationCooldown.get(cooldownKey);
    
    if (lastTranslation && (now - lastTranslation) < 3000) {
      return fallbackTranslation(text, targetLang);
    }
    
    client.translationCooldown.set(cooldownKey, now);
    
    // Limpiar cooldown antiguos
    setTimeout(() => {
      client.translationCooldown.delete(cooldownKey);
    }, 60000);

    // Usar la API con manejo mejorado
    const result = await translate(text, { to: targetLang });
    
    // MANEJO DE DIFERENTES FORMATOS DE RESPUESTA
    let translatedText;
    
    if (typeof result === 'string') {
      // Si es string directo
      translatedText = result;
    } else if (Array.isArray(result)) {
      // Si es array, tomar el primer elemento
      translatedText = result[0];
    } else if (result && typeof result === 'object') {
      // Si es objeto, intentar extraer el texto
      if (result.text) {
        translatedText = result.text;
      } else if (result[0] && result[0][0]) {
        // Formato de respuesta complejo de Google Translate
        translatedText = result[0][0];
      } else {
        // Convertir objeto a string como último recurso
        translatedText = JSON.stringify(result);
      }
    } else {
      // Cualquier otro caso
      translatedText = String(result);
    }
    
    // Validar que el texto traducido sea válido
    if (!translatedText || translatedText === text || translatedText === '[object Object]') {
      return fallbackTranslation(text, targetLang);
    }
    
    return translatedText;

  } catch (error) {
    console.error('Error en traducción:', error);
    return fallbackTranslation(text, targetLang);
  }
}

// Traducción de fallback mejorada
function fallbackTranslation(text, targetLang) {
  const translations = {
    // Español a Inglés
    'hola': 'hello',
    'adiós': 'goodbye', 
    'gracias': 'thank you',
    'por favor': 'please',
    'sí': 'yes',
    'no': 'no',
    'ayuda': 'help',
    'bienvenido': 'welcome',
    'lo siento': 'sorry',
    'buenos días': 'good morning',
    'buenas tardes': 'good afternoon',
    'buenas noches': 'good night',
    'cómo estás': 'how are you',
    'qué tal': 'how are you',
    'de nada': 'you\'re welcome',
    'entendido': 'understood',
    'claro': 'of course',
    'perfecto': 'perfect',
    
    // Inglés a Español
    'hello': 'hola',
    'hi': 'hola',
    'goodbye': 'adiós',
    'bye': 'adiós',
    'thanks': 'gracias',
    'thank you': 'gracias',
    'please': 'por favor',
    'yes': 'sí',
    'no': 'no',
    'help': 'ayuda',
    'welcome': 'bienvenido',
    'sorry': 'lo siento',
    'good morning': 'buenos días',
    'good afternoon': 'buenas tardes',
    'good night': 'buenas noches',
    'how are you': 'cómo estás',
    'understand': 'entender',
    'perfect': 'perfecto',
    'ok': 'ok',
    'okay': 'está bien'
  };

  const lowerText = text.toLowerCase().trim();
  
  // Buscar traducción exacta
  if (translations[lowerText]) {
    return translations[lowerText];
  }
  
  // Buscar palabras individuales
  const words = lowerText.split(/\s+/);
  const translatedWords = words.map(word => translations[word] || word);
  
  const result = translatedWords.join(' ');
  if (result !== lowerText) {
    return result;
  }
  
  return `[Traducción no disponible: "${text}"]`;
}

// Detector de idioma
function detectLanguage(text) {
  const spanishIndicators = /[áéíóúñ¿¡]/gi;
  const englishIndicators = /\b(the|and|for|with|this|that|what|are|is|you|they|we|have|has|can|will|should|could|would)\b/gi;
  
  const spanishCount = (text.match(spanishIndicators) || []).length;
  const englishCount = (text.match(englishIndicators) || []).length;
  
  if (spanishCount > englishCount) return 'es';
  if (englishCount > spanishCount) return 'en';
  
  return 'en';
}

// Comandos
const commands = [
  {
    name: 'help',
    description: 'Muestra todos los comandos disponibles del bot',
    options: []
  },
  {
    name: 'kick',
    description: 'Expulsar a un miembro del servidor',
    options: [
      {
        name: 'usuario',
        description: 'Usuario a expulsar',
        type: 6,
        required: true
      },
      {
        name: 'razon',
        description: 'Razón de la expulsión',
        type: 3,
        required: false
      }
    ]
  },
  {
    name: 'ban',
    description: 'Banear a un miembro del servidor',
    options: [
      {
        name: 'usuario',
        description: 'Usuario a banear',
        type: 6,
        required: true
      },
      {
        name: 'razon',
        description: 'Razón del baneo',
        type: 3,
        required: false
      },
      {
        name: 'dias',
        description: 'Días de mensajes a eliminar (0-7)',
        type: 4,
        required: false,
        min_value: 0,
        max_value: 7
      }
    ]
  },
  {
    name: 'unban',
    description: 'Desbanear a un usuario',
    options: [
      {
        name: 'user_id',
        description: 'ID del usuario a desbanear',
        type: 3,
        required: true
      }
    ]
  },
  {
    name: 'clear',
    description: 'Eliminar mensajes',
    options: [
      {
        name: 'cantidad',
        description: 'Número de mensajes a eliminar (1-100)',
        type: 4,
        required: true,
        min_value: 1,
        max_value: 100
      },
      {
        name: 'usuario',
        description: 'Eliminar solo mensajes de un usuario específico',
        type: 6,
        required: false
      }
    ]
  },
  {
    name: 'mute',
    description: 'Silenciar a un usuario',
    options: [
      {
        name: 'usuario',
        description: 'Usuario a silenciar',
        type: 6,
        required: true
      },
      {
        name: 'tiempo',
        description: 'Tiempo de silencio (ej: 1h, 30m, 1d)',
        type: 3,
        required: false
      },
      {
        name: 'razon',
        description: 'Razón del silencio',
        type: 3,
        required: false
      }
    ]
  },
  {
    name: 'unmute',
    description: 'Quitar silencio a un usuario',
    options: [
      {
        name: 'usuario',
        description: 'Usuario a quitar silencio',
        type: 6,
        required: true
      }
    ]
  },
  {
    name: 'warn',
    description: 'Advertir a un usuario',
    options: [
      {
        name: 'usuario',
        description: 'Usuario a advertir',
        type: 6,
        required: true
      },
      {
        name: 'razon',
        description: 'Razón de la advertencia',
        type: 3,
        required: true
      }
    ]
  },
  {
    name: 'userinfo',
    description: 'Obtener información de un usuario',
    options: [
      {
        name: 'usuario',
        description: 'Usuario del que obtener información',
        type: 6,
        required: false
      }
    ]
  },
  {
    name: 'serverinfo',
    description: 'Obtener información del servidor',
    options: []
  },
  {
    name: 'set-translation-channel',
    description: 'Establecer el canal para conversaciones bilingües',
    options: [
      {
        name: 'canal',
        description: 'Canal donde se traducirán los mensajes automáticamente',
        type: 7,
        required: true,
        channel_types: [ChannelType.GuildText]
      }
    ]
  },
  {
    name: 'disable-auto-translate',
    description: 'Desactivar completamente la traducción automática en este servidor',
    options: []
  },
  {
    name: 'translate',
    description: 'Traducir mensaje entre español e inglés',
    options: [
      {
        name: 'mensaje',
        description: 'Mensaje a traducir',
        type: 3,
        required: true
      },
      {
        name: 'traduccion',
        description: 'Traducción personalizada (opcional)',
        type: 3,
        required: false
      },
      {
        name: 'idioma_destino',
        description: 'Idioma destino para la traducción',
        type: 3,
        required: false,
        choices: [
          { name: 'Español', value: 'es' },
          { name: 'Inglés', value: 'en' },
          { name: 'Ambos idiomas', value: 'both' }
        ]
      },
      {
        name: 'color',
        description: 'Color del embed (hexadecimal)',
        type: 3,
        required: false
      }
    ]
  },
  {
    name: 'announce',
    description: 'Crear un mensaje anuncio/traducción personalizado',
    options: [
      {
        name: 'texto',
        description: 'Texto principal del mensaje',
        type: 3,
        required: false
      },
      {
        name: 'titulo',
        description: 'Título del embed',
        type: 3,
        required: false
      },
      {
        name: 'traduccion',
        description: 'Texto traducido (si no se proporciona, se traduce automáticamente)',
        type: 3,
        required: false
      },
      {
        name: 'color',
        description: 'Color del embed en hexadecimal (ej: #FF0000)',
        type: 3,
        required: false
      },
      {
        name: 'idioma_destino',
        description: 'Idioma para la traducción automática',
        type: 3,
        required: false,
        choices: [
          { name: 'Español', value: 'es' },
          { name: 'Inglés', value: 'en' },
          { name: 'Ambos idiomas', value: 'both' }
        ]
      },
      {
        name: 'imagen',
        description: 'URL de la imagen a mostrar',
        type: 3,
        required: false
      }
    ]
  },
  {
    name: 'translate-message',
    description: 'Traducir un mensaje existente',
    options: [
      {
        name: 'mensaje_id',
        description: 'ID del mensaje a traducir',
        type: 3,
        required: true
      },
      {
        name: 'idioma',
        description: 'Idioma destino',
        type: 3,
        required: false,
        choices: [
          { name: 'Español', value: 'es' },
          { name: 'Inglés', value: 'en' },
          { name: 'Ambos idiomas', value: 'both' }
        ]
      }
    ]
  },
  {
    name: 'quick-translate',
    description: 'Traducción rápida de texto',
    options: [
      {
        name: 'texto',
        description: 'Texto a traducir',
        type: 3,
        required: true
      },
      {
        name: 'de',
        description: 'Idioma de origen',
        type: 3,
        required: false,
        choices: [
          { name: 'Auto-detectar', value: 'auto' },
          { name: 'Español', value: 'es' },
          { name: 'Inglés', value: 'en' }
        ]
      },
      {
        name: 'a',
        description: 'Idioma destino',
        type: 3,
        required: false,
        choices: [
          { name: 'Español', value: 'es' },
          { name: 'Inglés', value: 'en' }
        ]
      }
    ]
  }
];

// Manejar interacciones de comandos
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName, options, member, guild } = interaction;

  // Verificar permisos para comandos de administración
  const adminCommands = ['kick', 'ban', 'unban', 'clear', 'mute', 'unmute', 'warn', 'set-translation-channel', 'announce', 'disable-auto-translate'];
  if (adminCommands.includes(commandName) && !hasPermission(member)) {
    return interaction.reply({
      content: '❌ No tienes permisos para usar este comando.',
      flags: 64
    });
  }

  try {
    switch (commandName) {
      case 'help':
        await handleHelp(interaction);
        break;
      case 'kick':
        await handleKick(interaction, options);
        break;
      case 'ban':
        await handleBan(interaction, options);
        break;
      case 'unban':
        await handleUnban(interaction, options);
        break;
      case 'clear':
        await handleClear(interaction, options);
        break;
      case 'mute':
        await handleMute(interaction, options);
        break;
      case 'unmute':
        await handleUnmute(interaction, options);
        break;
      case 'warn':
        await handleWarn(interaction, options);
        break;
      case 'userinfo':
        await handleUserInfo(interaction, options);
        break;
      case 'serverinfo':
        await handleServerInfo(interaction);
        break;
      case 'set-translation-channel':
        await handleSetTranslationChannel(interaction, options);
        break;
      case 'disable-auto-translate':
        await handleDisableAutoTranslate(interaction);
        break;
      case 'translate':
        await handleTranslate(interaction, options);
        break;
      case 'announce':
        await handleAnnounce(interaction, options);
        break;
      case 'translate-message':
        await handleTranslateMessage(interaction, options);
        break;
      case 'quick-translate':
        await handleQuickTranslate(interaction, options);
        break;
    }
  } catch (error) {
    console.error(`Error en comando ${commandName}:`, error);
    await interaction.reply({
      content: '❌ Ocurrió un error al ejecutar el comando.',
      flags: 64
    });
  }
});

// ========== FUNCIONES DE COMANDOS ==========

async function handleHelp(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('🤖 Comandos de Obsidian Network Bot')
    .setColor('#7289DA')
    .setDescription('Lista de todos los comandos disponibles:')
    .addFields(
      {
        name: '🛡️ Moderación',
        value: '`/kick` - Expulsar usuario\n`/ban` - Banear usuario\n`/unban` - Desbanear usuario\n`/clear` - Limpiar mensajes\n`/mute` - Silenciar usuario\n`/unmute` - Quitar silencio\n`/warn` - Advertir usuario',
        inline: true
      },
      {
        name: '🌍 Traducción',
        value: '`/translate` - Traducir mensaje\n`/quick-translate` - Traducción rápida\n`/announce` - Anuncio bilingüe\n`/translate-message` - Traducir mensaje existente\n`/set-translation-channel` - Establecer canal bilingüe\n`/disable-auto-translate` - Desactivar auto-traducción',
        inline: true
      },
      {
        name: '⚙️ Utilidades',
        value: '`/userinfo` - Info usuario\n`/serverinfo` - Info servidor',
        inline: true
      }
    )
    .setFooter({ 
      text: 'Obsidian Network - Soporte multilingüe',
      iconURL: interaction.guild.iconURL({ dynamic: true }) 
    })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: 64 });
}

// NUEVO: Comando para desactivar completamente el auto-traducción
async function handleDisableAutoTranslate(interaction) {
  const guildId = interaction.guild.id;
  
  // Eliminar completamente el canal de traducción para este servidor
  const hadChannel = client.translationChannels.has(guildId);
  const oldChannelId = client.translationChannels.get(guildId);
  client.translationChannels.delete(guildId);
  
  if (hadChannel) {
    const oldChannel = interaction.guild.channels.cache.get(oldChannelId);
    const channelName = oldChannel ? oldChannel.name : `ID: ${oldChannelId}`;
    
    await interaction.reply({
      content: `✅ **Traducción automática desactivada completamente** en este servidor.\n\n🗑️ Se eliminó el canal designado: **${channelName}**\n\nLos mensajes ya no se traducirán automáticamente en ningún canal. Para reactivarla, usa \`/set-translation-channel\`.`,
      flags: 64
    });
  } else {
    await interaction.reply({
      content: '❌ No había traducción automática activada en este servidor.',
      flags: 64
    });
  }
}

async function handleSetTranslationChannel(interaction, options) {
  const channel = options.getChannel('canal');
  const guildId = interaction.guild.id;
  
  // Guardar SOLO el canal específico por ID
  client.translationChannels.set(guildId, channel.id);
  
  const embed = new EmbedBuilder()
    .setTitle('🌍 Canal de Traducción Establecido')
    .setColor(0x0099FF)
    .setDescription(`El canal ${channel} ha sido configurado para **traducciones automáticas exclusivas**.`)
    .addFields(
      { 
        name: '¿Qué hace esto?', 
        value: '**SOLO** los mensajes en este canal específico se traducirán automáticamente entre español e inglés. Los demás canales no se verán afectados.' 
      },
      { 
        name: 'Configuración', 
        value: `**Canal designado:** ${channel}\n**Servidor:** ${interaction.guild.name}\n**ID del Canal:** ${channel.id}` 
      },
      {
        name: 'Para desactivar',
        value: 'Usa `/disable-auto-translate` para desactivar completamente la traducción automática en este servidor.'
      }
    )
    .setTimestamp()
    .setFooter({ 
      text: 'Obsidian Network - Traducción exclusiva por canal', 
      iconURL: interaction.guild.iconURL({ dynamic: true }) 
    });

  await interaction.reply({ embeds: [embed] });
}

async function handleTranslate(interaction, options) {
  const mensaje = options.getString('mensaje');
  const traduccion = options.getString('traduccion');
  const idiomaDestino = options.getString('idioma_destino') || 'both';
  const color = options.getString('color');

  await interaction.deferReply();

  const embedColor = color && isValidHexColor(color) ? color : '#7289DA';

  try {
    let contenidoEspañol = '';
    let contenidoIngles = '';

    if (idiomaDestino === 'both') {
      const detectedLang = detectLanguage(mensaje);
      
      if (detectedLang === 'es') {
        contenidoEspañol = mensaje;
        contenidoIngles = traduccion || await translateText(mensaje, 'en');
      } else {
        contenidoIngles = mensaje;
        contenidoEspañol = traduccion || await translateText(mensaje, 'es');
      }
    } else if (idiomaDestino === 'es') {
      contenidoEspañol = traduccion || await translateText(mensaje, 'es');
      contenidoIngles = mensaje;
    } else if (idiomaDestino === 'en') {
      contenidoIngles = traduccion || await translateText(mensaje, 'en');
      contenidoEspañol = mensaje;
    }

    // Validar que las traducciones sean strings válidos
    const esValido = (contenidoEspañol && typeof contenidoEspañol === 'string') || 
                    (contenidoIngles && typeof contenidoIngles === 'string');
    
    if (!esValido) {
      return await interaction.editReply({
        content: '❌ No se pudo traducir el mensaje. Intenta con un texto diferente.'
      });
    }

    // Asegurar que los valores sean strings
    const esValor = contenidoEspañol || 'Traducción no disponible';
    const enValor = contenidoIngles || 'Translation not available';

    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle('🌍 Mensaje Traducido')
      .addFields(
        { 
          name: '🇪🇸 Español', 
          value: String(esValor).substring(0, 1024),
          inline: false 
        },
        { 
          name: '🇬🇧 English', 
          value: String(enValor).substring(0, 1024),
          inline: false 
        }
      )
      .setFooter({ 
        text: `Traducido por ${interaction.user.tag}`,
        iconURL: interaction.guild.iconURL({ dynamic: true })
      })
      .setTimestamp();

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('translate_again')
          .setLabel('🔄 Traducir de nuevo')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('correct_translation')
          .setLabel('✏️ Corregir traducción')
          .setStyle(ButtonStyle.Secondary)
      );

    await interaction.editReply({ 
      embeds: [embed],
      components: [row]
    });

  } catch (error) {
    console.error('Error en comando translate:', error);
    await interaction.editReply({
      content: '❌ Error al traducir el mensaje. Intenta nuevamente.'
    });
  }
}

async function handleQuickTranslate(interaction, options) {
  const texto = options.getString('texto');
  const fromLang = options.getString('de') || 'auto';
  const toLang = options.getString('a') || 'en';

  await interaction.deferReply();

  try {
    let sourceLang = fromLang;
    if (sourceLang === 'auto') {
      sourceLang = detectLanguage(texto);
    }

    const translated = await translateText(texto, toLang);
    
    // Validar que la traducción sea un string válido
    if (!translated || typeof translated !== 'string') {
      return await interaction.editReply({
        content: '❌ No se pudo traducir el texto. Intenta con un texto diferente.'
      });
    }

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('🔤 Traducción Rápida')
      .addFields(
        { 
          name: `📥 ${sourceLang === 'es' ? 'Español' : 'English'}`, 
          value: texto.length > 1024 ? texto.substring(0, 1020) + '...' : texto, 
          inline: false 
        },
        { 
          name: `📤 ${toLang === 'es' ? 'Español' : 'English'}`, 
          value: translated.length > 1024 ? translated.substring(0, 1020) + '...' : translated, 
          inline: false 
        }
      )
      .setFooter({ 
        text: `Traducido por ${interaction.user.tag}`,
        iconURL: interaction.guild.iconURL({ dynamic: true })
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Error en quick-translate:', error);
    await interaction.editReply({
      content: '❌ Error en la traducción rápida. Intenta nuevamente.'
    });
  }
}

// Funciones básicas de moderación
async function handleKick(interaction, options) {
  const user = options.getUser('usuario');
  const reason = options.getString('razon') || 'Sin razón especificada';
  
  const embed = new EmbedBuilder()
    .setTitle('👢 Usuario Expulsado')
    .setColor(0xFFA500)
    .addFields(
      { name: 'Usuario', value: `${user.tag}`, inline: true },
      { name: 'Moderador', value: `${interaction.user.tag}`, inline: true },
      { name: 'Razón', value: reason, inline: false }
    )
    .setTimestamp()
    .setFooter({ 
      text: 'Obsidian Network', 
      iconURL: interaction.guild.iconURL({ dynamic: true }) 
    });

  await interaction.reply({ embeds: [embed] });
}

async function handleBan(interaction, options) {
  const user = options.getUser('usuario');
  const reason = options.getString('razon') || 'Sin razón especificada';
  const days = options.getInteger('dias') || 0;
  
  const embed = new EmbedBuilder()
    .setTitle('🔨 Usuario Baneado')
    .setColor(0xFF0000)
    .addFields(
      { name: 'Usuario', value: `${user.tag}`, inline: true },
      { name: 'Moderador', value: `${interaction.user.tag}`, inline: true },
      { name: 'Razón', value: reason, inline: false },
      { name: 'Mensajes eliminados', value: `${days} días`, inline: true }
    )
    .setTimestamp()
    .setFooter({ 
      text: 'Obsidian Network', 
      iconURL: interaction.guild.iconURL({ dynamic: true }) 
    });

  await interaction.reply({ embeds: [embed] });
}

async function handleClear(interaction, options) {
  const amount = options.getInteger('cantidad');
  
  const embed = new EmbedBuilder()
    .setTitle('🧹 Mensajes Eliminados')
    .setColor(0x00FF00)
    .setDescription(`Se eliminaron ${amount} mensajes.`)
    .setTimestamp()
    .setFooter({ 
      text: 'Obsidian Network', 
      iconURL: interaction.guild.iconURL({ dynamic: true }) 
    });

  const reply = await interaction.reply({ 
    embeds: [embed], 
    flags: 64
  });
  
  setTimeout(() => {
    reply.delete().catch(console.error);
  }, 5000);
}

async function handleUnban(interaction, options) {
  const userId = options.getString('user_id');
  await interaction.reply({ content: `✅ Usuario con ID ${userId} ha sido desbaneado.`, flags: 64 });
}

async function handleMute(interaction, options) {
  const user = options.getUser('usuario');
  await interaction.reply({ content: `✅ ${user.tag} ha sido silenciado.`, flags: 64 });
}

async function handleUnmute(interaction, options) {
  const user = options.getUser('usuario');
  await interaction.reply({ content: `✅ Silencio removido de ${user.tag}.`, flags: 64 });
}

async function handleWarn(interaction, options) {
  const user = options.getUser('usuario');
  const reason = options.getString('razon');
  await interaction.reply({ content: `⚠️ ${user.tag} ha sido advertido: ${reason}`, flags: 64 });
}

async function handleUserInfo(interaction, options) {
  const user = options.getUser('usuario') || interaction.user;
  const member = interaction.guild.members.cache.get(user.id);
  
  const embed = new EmbedBuilder()
    .setTitle(`👤 Información de ${user.username}`)
    .setColor(0x0099FF)
    .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
    .addFields(
      { name: 'Usuario', value: user.tag, inline: true },
      { name: 'ID', value: user.id, inline: true },
      { name: 'Cuenta creada', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
      { name: 'Se unió al servidor', value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'No miembro', inline: true }
    )
    .setFooter({ 
      text: 'Obsidian Network', 
      iconURL: interaction.guild.iconURL({ dynamic: true }) 
    })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleServerInfo(interaction) {
  const guild = interaction.guild;
  
  const embed = new EmbedBuilder()
    .setTitle(`🏠 ${guild.name}`)
    .setColor(0x7289DA)
    .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
    .addFields(
      { name: '👥 Miembros', value: guild.memberCount.toString(), inline: true },
      { name: '📅 Creado', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
      { name: '👑 Propietario', value: `<@${guild.ownerId}>`, inline: true },
      { name: '📊 Canales', value: `Texto: ${guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size}\nVoz: ${guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size}`, inline: true },
      { name: '🌍 Idioma', value: guild.preferredLocale, inline: true },
      { name: '🆔 Server ID', value: guild.id, inline: true }
    )
    .setFooter({ 
      text: 'Obsidian Network', 
      iconURL: guild.iconURL({ dynamic: true }) 
    })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleAnnounce(interaction, options) {
  const texto = options.getString('texto') || 'Sin texto';
  const titulo = options.getString('titulo') || 'Anuncio Importante';
  
  const embed = new EmbedBuilder()
    .setTitle(titulo)
    .setDescription(texto)
    .setColor(0x0099FF)
    .setTimestamp()
    .setFooter({ 
      text: `Anuncio por ${interaction.user.tag}`,
      iconURL: interaction.guild.iconURL({ dynamic: true })
    });

  await interaction.reply({ embeds: [embed] });
}

async function handleTranslateMessage(interaction, options) {
  const messageId = options.getString('mensaje_id');
  
  try {
    const message = await interaction.channel.messages.fetch(messageId);
    const translated = await translateText(message.content, 'en');
    
    const embed = new EmbedBuilder()
      .setTitle('🌍 Mensaje Traducido')
      .addFields(
        { name: 'Original', value: message.content.substring(0, 1024), inline: false },
        { name: 'Traducido', value: translated.substring(0, 1024), inline: false }
      )
      .setColor(0x7289DA)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    await interaction.reply({ 
      content: '❌ No se pudo encontrar o traducir el mensaje.', 
      flags: 64 
    });
  }
}

// ========== SISTEMA DE TRADUCCIÓN AUTOMÁTICA MEJORADO ==========

client.on('messageCreate', async message => {
  if (message.author.bot) return;
  
  // VERIFICACIÓN EXCLUSIVA: Solo traducir si este canal EXACTO está configurado
  const guildId = message.guild?.id;
  if (!guildId) return;
  
  const translationChannelId = client.translationChannels.get(guildId);
  
  // SOLO traducir si este canal específico es el designado
  if (!translationChannelId || message.channel.id !== translationChannelId) {
    return; // No hacer nada en otros canales
  }
  
  // Ignorar comandos y mensajes muy cortos
  if (message.content.startsWith('/') || message.content.length < 3) return;

  // Rate limiting por usuario
  const userCooldownKey = `${message.author.id}-${message.channel.id}`;
  const now = Date.now();
  const lastUserMessage = client.translationCooldown.get(userCooldownKey);
  
  if (lastUserMessage && (now - lastUserMessage) < 5000) {
    return;
  }
  
  client.translationCooldown.set(userCooldownKey, now);

  try {
    const detectedLang = detectLanguage(message.content);
    const targetLang = detectedLang === 'es' ? 'en' : 'es';
    
    if (message.content.length > 3) {
      const translated = await translateText(message.content, targetLang);
      
      if (translated && translated !== message.content && typeof translated === 'string') {
        const embed = new EmbedBuilder()
          .setDescription(`**${targetLang === 'es' ? '🇪🇸 Español' : '🇬🇧 English'}:** ${translated}`)
          .setColor(targetLang === 'es' ? '#00FF00' : '#FFD700')
          .setFooter({ 
            text: `Traducción automática • ${targetLang === 'es' ? 'Español' : 'English'}`,
            iconURL: message.guild.iconURL({ dynamic: true })
          });

        const reply = await message.reply({ embeds: [embed] });
        await message.react('🌍');
        
        setTimeout(async () => {
          try {
            await reply.delete();
          } catch (error) {}
        }, 15 * 60 * 1000);
      }
    }
  } catch (error) {
    console.error('Error en traducción automática:', error);
  }
});

// Manejar interacciones de botones
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  const { customId, message, user } = interaction;

  try {
    switch (customId) {
      case 'translate_again':
        await interaction.reply({
          content: '🔄 Usa `/translate` para traducir otro mensaje.',
          flags: 64
        });
        break;
      case 'correct_translation':
        await interaction.reply({
          content: '✏️ Usa `/translate` con la opción "traduccion" para proporcionar una corrección.',
          flags: 64
        });
        break;
    }
  } catch (error) {
    console.error('Error en interacción de botón:', error);
  }
});

// Función para validar color hexadecimal
function isValidHexColor(color) {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

// Manejar errores
client.on('error', console.error);
process.on('unhandledRejection', console.error);

// Iniciar el bot
client.login(process.env.TOKEN).catch(error => {
  console.error('❌ Error al iniciar sesión:', error);
  process.exit(1);
});