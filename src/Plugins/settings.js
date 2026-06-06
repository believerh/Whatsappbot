const fs = require('fs');
const fsp = fs.promises;
const {loadDatabase, saveDatabase } = require('../../src/Core/database.js');
const { handleMediaUpload } = require('../../lib/catbox');

module.exports = [
{
  command: ['addbadword'],
  operate: async ({ Cypher, m, isCreator, mess, prefix, args, q, bad, reply }) => {
    if (!isCreator) return reply(mess.owner);
    if (!q) return reply(`Use ${prefix}addbadword [word]`);

    let word = q.trim().toLowerCase();
    word = word.replace(/[^\p{L}\p{N}\s]/gu, '');
    
    if (word.split(' ').length > 2) return reply('❌ Please add only one or two words max.');
    if (word.length < 3) return reply('❌ That word is too short to filter.');
    
    if (bad.includes(word)) return reply('⚠️ This word already exists in the bad word list.');

    bad.push(word);

    try {
      await fsp.writeFile('./src/Database/badwords.json', JSON.stringify(bad, null, 2));
      reply(`✅ Successfully added bad word: *${word}*`);
    } catch (error) {
      console.error('Error writing to badwords.json:', error);
      reply('⚠️ An error occurred while adding the bad word.');
    }
  }
},
{
  command: ['addignorelist', 'ban', 'banchat'],
  operate: async ({ m, args, isCreator, loadBlacklist, mess, reply, saveDatabase, text }) => {
    if (!isCreator) return reply(mess.owner);


    let mentionedUser = m.mentionedJid && m.mentionedJid[0];
    let quotedUser = m.quoted && m.quoted.sender;
    let userToAdd = mentionedUser || quotedUser || (text ? text.replace(/\D/g, "") + "@s.whatsapp.net" : null) || m.chat;

    if (!userToAdd) return reply('Mention a user, reply to their message, or provide a phone number to ignore.');

    let blacklist = loadBlacklist();
    if (!blacklist.blacklisted_numbers.includes(userToAdd)) {
        blacklist.blacklisted_numbers.push(userToAdd);

    await saveDatabase();
await reply(`+${userToAdd.split('@')[0]} added to the ignore list.`);
        } else {
await reply(`+${userToAdd.split('@')[0]} is already ignored.`);
        }
  }
},
{
  command: ['addsudo', 'addowner', 'setsudo'],
  operate: async ({ m, isCreator, reply, saveDatabase, text }) => {
    if (!isCreator) return reply(mess.owner);

    global.db.sudo = Array.isArray(global.db.sudo) ? global.db.sudo : [];
    global.db.sudoMap = global.db.sudoMap && typeof global.db.sudoMap === "object" ? global.db.sudoMap : {};
    const sudoList = global.db.sudo;

    const isGroup = m.chat?.endsWith('@g.us');
    const isPrivate = m.chat?.endsWith('@s.whatsapp.net') || m.chat?.endsWith('@lid');

    if (
      isGroup &&
      !(m.mentionedJid && m.mentionedJid[0]) &&
      !(m.quoted && m.quoted.sender)
    ) {
      return reply('Reply to or tag a person!');
    }

    const mentionedUser = m.mentionedJid && m.mentionedJid[0];
    const quotedUser = m.quoted && m.quoted.sender;
    const numberAsJid = text ? text.replace(/\D/g, "") + "@s.whatsapp.net" : null;

    const explicitTarget = mentionedUser || quotedUser || numberAsJid;
    const userToAdd = explicitTarget || (isPrivate ? m.chat : null);

    if (!userToAdd) {
      return reply('Mention/tag a user, reply to them, or type their number to add to sudo.');
    }

    const isUserId = (id) =>
      typeof id === 'string' &&
      (id.endsWith('@s.whatsapp.net') || id.endsWith('@lid'));

    const digits = (id) => (id ? String(id).replace(/[^0-9]/g, "") : "");
    const bare = (id) => (typeof id === "string" && id.includes("@") ? id.split("@")[0] : "");

    const candidates = new Set();

    if (isUserId(userToAdd)) candidates.add(userToAdd);
    if (isUserId(mentionedUser)) candidates.add(mentionedUser);
    if (isUserId(quotedUser)) candidates.add(quotedUser);
    if (isUserId(numberAsJid)) candidates.add(numberAsJid);

    if (isUserId(m.chat) && digits(m.chat) && digits(userToAdd) && digits(m.chat) === digits(userToAdd)) {
      candidates.add(m.chat);
    }

    if (candidates.size === 0) {
      return reply('Could not detect a valid user id (@s.whatsapp.net or @lid). Try replying to the user.');
    }

    const arr = Array.from(candidates);
    const jidPick = arr.find(x => x.endsWith("@s.whatsapp.net")) || null;
    const lidPick = arr.find(x => x.endsWith("@lid")) || null;

    if (jidPick && lidPick) {
      const phone = digits(jidPick);
      const lidBare = bare(lidPick);
      if (phone && lidBare) {
        global.db.sudoMap[phone] = lidBare;
        global.db.sudoMap[lidBare] = phone;
      }
    }

    let addedAny = false;
    for (const id of candidates) {
      if (!sudoList.includes(id)) {
        sudoList.push(id);
        addedAny = true;
      }
    }

    const displayId = jidPick || lidPick || arr[0];
    const displayNum = displayId ? bare(displayId) : digits(userToAdd);

    if (addedAny) {
      await saveDatabase();
      delete global._creatorCache   // 🔥 reset cache
      return reply(`+${displayNum} added to the sudo list and can use any bot function (even private mode).`);
    }

    return reply(`+${displayNum} is already a sudo user.`);
  }
},
{
  command: ['delsudo'],
  operate: async ({ m, isCreator, reply, saveDatabase, text }) => {
    if (!isCreator) return reply(mess.owner);

    global.db.sudo = Array.isArray(global.db.sudo) ? global.db.sudo : [];
    global.db.sudoMap = global.db.sudoMap && typeof global.db.sudoMap === "object" ? global.db.sudoMap : {};
    const sudoList = global.db.sudo;

    const isGroup = m.chat?.endsWith('@g.us');
    const isPrivate = m.chat?.endsWith('@s.whatsapp.net') || m.chat?.endsWith('@lid');

    if (
      isGroup &&
      !(m.mentionedJid && m.mentionedJid[0]) &&
      !(m.quoted && m.quoted.sender)
    ) {
      return reply('Reply to or tag a person!');
    }

    const mentionedUser = m.mentionedJid && m.mentionedJid[0];
    const quotedUser = m.quoted && m.quoted.sender;
    const numberAsJid = text ? text.replace(/\D/g, "") + "@s.whatsapp.net" : null;

    const explicitTarget = mentionedUser || quotedUser || numberAsJid;
    const userToRemove = explicitTarget || (isPrivate ? m.chat : null);

    if (!userToRemove) {
      return reply('Mention/tag a user, reply to them, or type their number to remove from sudo.');
    }

    const isUserId = (id) =>
      typeof id === 'string' &&
      (id.endsWith('@s.whatsapp.net') || id.endsWith('@lid'));

    const digits = (id) => (id ? String(id).replace(/[^0-9]/g, "") : "");
    const bare = (id) => (typeof id === "string" && id.includes("@") ? id.split("@")[0] : "");

    const candidates = new Set();
    if (isUserId(userToRemove)) candidates.add(userToRemove);
    if (isUserId(mentionedUser)) candidates.add(mentionedUser);
    if (isUserId(quotedUser)) candidates.add(quotedUser);
    if (isUserId(numberAsJid)) candidates.add(numberAsJid);

    if (candidates.size === 0) {
      return reply('Could not detect a valid user id (@s.whatsapp.net or @lid). Try replying to the user.');
    }

    const fullSet = new Set();
    const bareSet = new Set();
    const digitSet = new Set();

    for (const id of candidates) {
      fullSet.add(id);
      const b = bare(id);
      if (b) bareSet.add(b);
      const d = digits(id);
      if (d) digitSet.add(d);
    }

    for (const d of Array.from(digitSet)) {
      const mapped = global.db.sudoMap[d];
      if (mapped) {
        if (String(mapped).includes("@")) {
          fullSet.add(String(mapped));
          const b = bare(String(mapped));
          if (b) bareSet.add(b);
          const dd = digits(String(mapped));
          if (dd) digitSet.add(dd);
        } else {
          bareSet.add(String(mapped));
        }
      }
    }

    for (const b of Array.from(bareSet)) {
      const mapped = global.db.sudoMap[b];
      if (mapped) {
        if (String(mapped).includes("@")) {
          fullSet.add(String(mapped));
          const bb = bare(String(mapped));
          if (bb) bareSet.add(bb);
          const dd = digits(String(mapped));
          if (dd) digitSet.add(dd);
        } else {
          digitSet.add(String(mapped));
        }
      }
    }

    const before = sudoList.length;

    global.db.sudo = sudoList.filter((id) => {
      if (typeof id !== "string") return true;
      if (fullSet.has(id)) return false;
      const b = bare(id);
      if (b && bareSet.has(b)) return false;
      const d = digits(id);
      if (d && digitSet.has(d)) return false;
      return true;
    });

    const removedCount = before - global.db.sudo.length;

    const arr = Array.from(candidates);
    const displayId = arr.find(x => x.endsWith("@s.whatsapp.net")) || arr.find(x => x.endsWith("@lid")) || arr[0];
    const displayNum = displayId ? bare(displayId) : (digits(userToRemove) || "user");

    if (removedCount > 0) {
      await saveDatabase();
      delete global._creatorCache   // 🔥 reset cache
      return reply(`+${displayNum} removed from the sudo list.`);
    }

    return reply(`+${displayNum} is not in the sudo list.`);
  }
},
  {
  command: ['alwaysonline'],
  operate: async ({ Cypher, m, reply, args, prefix, command, isCreator, mess, db, botNumber, saveDatabase }) => {
    if (!isCreator) return reply(mess.owner);
    if (args.length < 1) return reply(`Example: ${prefix + command} on/off`);

    const validOptions = ["on", "off"];
    const option = args[0].toLowerCase();

    if (!validOptions.includes(option)) return reply("Invalid option");

    db.settings.alwaysonline = option === "on";

    await saveDatabase();

    reply(`Always-online ${option === "on" ? "enabled" : "disabled"} successfully`);
  }
},
  {
  command: ['antibug'],
  operate: async ({ Cypher, m, reply, args, prefix, command, isCreator, mess, db, botNumber, saveDatabase }) => {
    if (!isCreator) return reply(mess.owner);
    if (args.length < 1) return reply(`Example: ${prefix + command} on/off`);

    const validOptions = ["on", "off"];
    const option = args[0].toLowerCase();

    if (!validOptions.includes(option)) return reply("Invalid option");

    db.settings.antibug = option === "on";

    await saveDatabase();

    reply(`Anti-bug (Experimental) ${option === "on" ? "enabled" : "disabled"} successfully`);
  }
},
{
  command: ['anticall'],
  operate: async ({ reply, args, prefix, command, isCreator, mess, db, saveDatabase }) => {
    if (!isCreator) return reply(mess.owner);
    if (args.length < 1) return reply(`Example: ${prefix + command} block/decline/off\n\nblock - Declines and blocks callers\ndecline - Declines incoming calls\noff - disables anticall`);

    const validOptions = ["block", "decline", "off"];
    const option = args[0].toLowerCase();

    if (!validOptions.includes(option)) return reply(`Invalid option; type *${prefix}anticall* to see available options!`);

    db.settings.anticall = option === "off" ? false : option;

    await saveDatabase();

    reply(`Anti-call set to *${option}* successfully.`);
  }
},
{
  command: ['antidelete'],
  operate: async ({ Cypher, m, reply, args, prefix, command, isCreator, mess, db, botNumber, saveDatabase }) => {
    if (!isCreator) return reply(mess.owner);
    if (args.length < 1) return reply(`Example: ${prefix + command} private/chat/off\n\nprivate - sends deleted messages to message yourself\nchat - sends to current chat\noff - disables antidelete`);

    const validOptions = ["private", "chat", "off"];
    const option = args[0].toLowerCase();

    if (!validOptions.includes(option)) return reply("Invalid option. Use: private, chat, or off");

    db.settings.antidelete = option;

    await saveDatabase();

    reply(`Anti-delete mode set to: *${option}*`);
  }
},
  {
  command: ['antideletestatus', 'antistatusdelete'],
  operate: async ({ Cypher, m, reply, args, prefix, command, isCreator, mess, db, botNumber, saveDatabase }) => {
    if (!isCreator) return reply(mess.owner);
    if (args.length < 1) return reply(`Example: ${prefix + command} on/off`);

    const validOptions = ["on", "off"];
    const option = args[0].toLowerCase();

    if (!validOptions.includes(option)) return reply("Invalid option");

    db.settings.statusantidelete = option === "on";

    await saveDatabase();

    reply(`Anti-delete Status ${option === "on" ? "enabled" : "disabled"} successfully`);
  }
},
{
  command: ['antiedit'],
  operate: async ({ Cypher, m, reply, args, prefix, command, isCreator, mess, db, botNumber, saveDatabase }) => {
    if (!isCreator) return reply(mess.owner);
    if (args.length < 1) return reply(`Example: ${prefix + command} private/chat/off\n\n private - sends edited messages to message yourself\nchat - sends to current chat\noff - disables antiedit`);

    const validOptions = ["private", "chat", "off"];
    const option = args[0].toLowerCase();

    if (!validOptions.includes(option)) return reply("Invalid option. Use: private, chat, or off");

    db.settings.antiedit = option;

    await saveDatabase();

    reply(`Anti-edit mode set to: *${option}*`);
  }
},
  {
  command: ['autobio'],
  operate: async ({ Cypher, m, reply, args, prefix, command, isCreator, mess, db, botNumber, saveDatabase }) => {
    if (!isCreator) return reply(mess.owner);
    if (args.length < 1) return reply(`Example: ${prefix + command} on/off`);

    const validOptions = ["on", "off"];
    const option = args[0].toLowerCase();

    if (!validOptions.includes(option)) return reply("Invalid option");

    db.settings.autobio = option === "on";

    await saveDatabase();

    reply(`Auto-bio ${option === "on" ? "enabled" : "disabled"} successfully`);
  }
},
  {
  command: ['autoreactstatus', 'autostatusreact'],
  operate: async ({ Cypher, m, reply, args, prefix, command, isCreator, mess, db, botNumber, saveDatabase }) => {
    if (!isCreator) return reply(mess.owner);
    if (args.length < 1) return reply(`Example: ${prefix + command} on/off`);

    const validOptions = ["on", "off"];
    const option = args[0].toLowerCase();

    if (!validOptions.includes(option)) return reply("Invalid option");

    db.settings.autoreactstatus = option === "on";

    await saveDatabase();

    reply(`Auto status reaction ${option === "on" ? "enabled" : "disabled"} successfully.`);
  }
},
  {
  command: ['autoviewstatus', 'autostatusview'],
  operate: async ({ Cypher, m, reply, args, prefix, command, isCreator, mess, db, botNumber, saveDatabase }) => {
    if (!isCreator) return reply(mess.owner);
    if (args.length < 1) return reply(`Example: ${prefix + command} on/off`);

    const validOptions = ["on", "off"];
    const option = args[0].toLowerCase();

    if (!validOptions.includes(option)) return reply("Invalid option");

    db.settings.autoviewstatus = option === "on";

    await saveDatabase();

    reply(`Auto status view ${option === "on" ? "enabled" : "disabled"} successfully`);
  }
},
{
  command: ['autoreact', 'autoreacting'],
  operate: async ({ reply, args, prefix, command, isCreator, mess, db, saveDatabase }) => {
    if (!isCreator) return reply(mess.owner);
    
    if (args.length < 1) {
      return reply(`Example: ${prefix + command} all/group/pm/command/off\n\nall - reacts to all messages\ngroup - reacts to messages in groups\npm - reacts to private messages\ncommand - reacts when a command is used\noff - disables auto-reaction`);
    }

    const validOptions = ["all", "group", "pm", "command", "off"];
    const option = args[0].toLowerCase();

    if (!validOptions.includes(option)) {
      return reply(`Invalid option; type *${prefix}autoreact* to see available options!`);
    }

    db.settings.autoreact = option === "off" ? false : option;

    await saveDatabase();

    reply(`Auto-reaction set to *${option}* successfully.`);
  }
},
{
  command: ['autoread', 'autoviewmsg'],
  operate: async ({ reply, args, prefix, command, isCreator, mess, db, saveDatabase }) => {
    if (!isCreator) return reply(mess.owner);
    if (args.length < 1) return reply(`Example: ${prefix + command} all/group/pm/command/off\n\nall - reads all messages\ngroup - reads group messages alone\npm - reads private messages alone\ncommand - reads bot commands only\noff disables autoread`);

    const validOptions = ["all", "group", "pm", "command", "off"];
    const option = args[0].toLowerCase();

    if (!validOptions.includes(option)) return reply(`Invalid option; type *${prefix}autoread* to see available options!`);

    db.settings.autoread = option === "off" ? false : option;

    await saveDatabase();

    reply(`Auto-read set to *${option}* successfully.`);
  }
},
{
  command: ['autotype', 'autotyping'],
  operate: async ({ reply, args, prefix, command, isCreator, mess, db, saveDatabase }) => {
    if (!isCreator) return reply(mess.owner);
    if (args.length < 1) return reply(`Example: ${prefix + command} all/group/pm/command/off\n\ngroup - typing in groups\npm - typing in private chats\ncommand - typing when a command is used\noff - disables autotyping`);

    const validOptions = ["all", "group", "pm", "command", "off"];
    const option = args[0].toLowerCase();

    if (!validOptions.includes(option)) return reply(`Invalid option; type *${prefix}autotype* to see available options!`);

    db.settings.autotype = option === "off" ? false : option;

    await saveDatabase();

    reply(`Auto-typing set to *${option}* successfully.`);
  }
},
{
  command: ['autorecord', 'autorecording'],
  operate: async ({ reply, args, prefix, command, isCreator, mess, db, saveDatabase }) => {
    if (!isCreator) return reply(mess.owner);
    if (args.length < 1) return reply(`Example: ${prefix + command} all/group/pm/command/off\n\ngroup - recording in groups\npm - recording in private chats\ncommand - recording when a command is used\noff - disables auto-recording`);

    const validOptions = ["all", "group", "pm", "command", "off"];
    const option = args[0].toLowerCase();

    if (!validOptions.includes(option)) return reply(`Invalid option; type *${prefix}autorecord* to see available options!`);

    db.settings.autorecord = option === "off" ? false : option;

    await saveDatabase();

    reply(`Auto-record set to *${option}* successfully.`);
  }
},
{
  command: ['autorecordtyping', 'autorecordtype'],
  operate: async ({ reply, args, prefix, command, isCreator, mess, db, saveDatabase }) => {
    if (!isCreator) return reply(mess.owner);
    if (args.length < 1) return reply(`Example: ${prefix + command} all/group/pm/command/off\n\ngroup - random typing/recording in groups\npm - random typing/recording in private chats\ncommand - random typing/recording when a command is used\noff - disables auto-record typing`);

    const validOptions = ["all", "group", "pm", "command", "off"];
    const option = args[0].toLowerCase();

    if (!validOptions.includes(option)) return reply(`Invalid option; type *${prefix}autorecordtype* to see available options!`);

    db.settings.autorecordtype = option === "off" ? false : option;

    await saveDatabase();

    reply(`Auto-record typing set to *${option}* successfully.`);
  }
},
{
  command: ['autoblock'],
  operate: async ({ Cypher, m, reply, args, prefix, command, isCreator, mess, db, botNumber, saveDatabase }) => {
    if (!isCreator) return reply(mess.owner);
    if (args.length < 1) return reply(`Example: ${prefix + command} on/off`);

    const validOptions = ["on", "off"];
    const option = args[0].toLowerCase();

    if (!validOptions.includes(option)) return reply("Invalid option");

    db.settings.autoblock = option === "on";

    await saveDatabase();

    reply(`Autoblock has been ${option === "on" ? "enabled" : "disabled"} successfully.`);
    reply("If autoblock is enabled, only users with the allowed country codes will be able to message the you in PM. To manage allowed country codes, use the commands:\n\n" +
           `${prefix}addcountrycode <countryCode> - Adds a country code\n` +
           `${prefix}delcountrycode <countryCode> - Removes a country code\n` +
           `${prefix}listcountrycode - Lists all allowed country codes`);
  }
},
{
  command: ['addcountrycode'],
  operate: async ({ Cypher, m, reply, args, prefix, command, isCreator, mess, db, botNumber, saveDatabase }) => {
    if (!isCreator) return reply(mess.owner);
    if (args.length < 1) return reply(`Example: ${prefix + command} 254`);

    const newCode = args[0].trim();
 
    if (!/^\d{2,3}$/.test(newCode)) return reply("Please enter a valid country code (2 or 3 digits).");

    const allowedCodes = db.settings.allowedCodes;
    if (allowedCodes.includes(newCode)) {
      return reply(`Country code ${newCode} is already in the allowed list.`);
    }

    allowedCodes.push(newCode);
    await saveDatabase();

    reply(`Country code ${newCode} has been added successfully.`);
  }
},
{
  command: ['delcountrycode'],
  operate: async ({ Cypher, m, reply, args, prefix, command, isCreator, mess, db, botNumber, saveDatabase }) => {
    if (!isCreator) return reply(mess.owner);
    if (args.length < 1) return reply(`Example: ${prefix + command} 254`);

    const codeToRemove = args[0].trim();

    const allowedCodes = db.settings.allowedCodes;
    const index = allowedCodes.indexOf(codeToRemove);

    if (index === -1) return reply(`Country code ${codeToRemove} is not in the allowed list.`);

    allowedCodes.splice(index, 1);
    await saveDatabase();

    reply(`Country code ${codeToRemove} has been removed successfully.`);
  }
},
{
  command: ['listcountrycode'],
  operate: async ({ Cypher, m, reply, args, prefix, command, isCreator, mess, db, botNumber }) => {
    if (!isCreator) return reply(mess.owner);
    const allowedCodes = db.settings.allowedCodes;
    if (allowedCodes.length === 0) return reply("No country codes are allowed.");

    const codesList = allowedCodes.join(', ');
    reply(`Allowed country codes: ${codesList}`);
  }
},
  {
  command: ['chatbot'],
  operate: async ({ m, reply, args, prefix, command, isCreator, mess, db, saveDatabase }) => {
    if (!isCreator) return reply(mess.owner)

    db.settings ??= {}
    db.chatbot ??= {}
    db.chatbot.disabled ??= {}
    db.chatbot.enabled ??= {}

    const chatId = m.chat
    const sub = args[0]?.toLowerCase()
    const value = args[1]?.toLowerCase()

    if (!sub) {
      return reply(
`Usage:
${prefix + command} all on/off
${prefix + command} group on/off
${prefix + command} on
${prefix + command} off`
      )
    }

    /* ---------- GLOBAL MODES ---------- */
    if (sub === 'all' || sub === 'group') {
      if (!['on', 'off'].includes(value)) {
        return reply(`Example: ${prefix + command} ${sub} on/off`)
      }

      if (value === 'on') {
        db.settings.chatbot = true
        db.settings.chatbotMode = sub
      } else {
        db.settings.chatbotMode = 'off'
      }

      await saveDatabase()
      return reply(`✅ Successfully set Chatbot mode to *${db.settings.chatbotMode}*`)
    }

    /* ---------- PER CHAT ---------- */
    if (sub === 'on') {
      db.settings.chatbot = true
      delete db.chatbot.disabled[chatId]
      db.chatbot.enabled[chatId] = true

      await saveDatabase()
      return reply('✅ Successfully *Enabled* Chatbot for this chat')
    }

    if (sub === 'off') {
      delete db.chatbot.enabled[chatId]
      db.chatbot.disabled[chatId] = true

      await saveDatabase()
      return reply('✅ Successfully *Disabled* Chatbot for this chat')
    }

    return reply(
`Invalid Option ❌

Usage:
${prefix + command} all on/off
${prefix + command} group on/off
${prefix + command} on
${prefix + command} off`
      )
  }
},
  {
  command: ['deletebadword'],
  operate: async ({ Cypher, m, isCreator, mess, prefix, args, q, bad, reply }) => {
    if (!isCreator) return reply(mess.owner);
    if (args.length < 1) return reply(`Use ${prefix}deletebadword [harsh word].`);

    const index = bad.indexOf(q);
    if (index === -1) {
      return reply('This word is not in the list!');
    }

    bad.splice(index, 1);

    try {
      await fsp.writeFile('./src/Database/badwords.json', JSON.stringify(bad, null, 2));
      reply('Successfully deleted bad word!');
    } catch (error) {
      console.error('Error writing to badwords.json:', error);
      reply('An error occurred while deleting the bad word.');
    }
  }
},
{
  command: ['delignorelist'],
  operate: async ({ m, args, isCreator, loadBlacklist, mess, reply, saveDatabase, text }) => {
    if (!isCreator) return reply(mess.owner);

    let mentionedUser = m.mentionedJid && m.mentionedJid[0];
    let quotedUser = m.quoted && m.quoted.sender;
    let userToRemove = mentionedUser || quotedUser || (text ? text.replace(/\D/g, "") + "@s.whatsapp.net" : null) || m.chat;

    if (!userToRemove) return reply('Mention a user, reply to their message, or provide a phone number to remove from the ignore list.');

    let blacklist = loadBlacklist();
    let index = blacklist.blacklisted_numbers.indexOf(userToRemove);
    if (index !== -1) {
        blacklist.blacklisted_numbers.splice(index, 1);

    await saveDatabase();

await reply(`+${userToRemove.split('@')[0]} removed from the ignore list.`);
    } else {
await reply(`+${userToRemove.split('@')[0]} is not in the ignore list.`);
    }
  }
},
{
  command: ['mode'],
  operate: async ({ Cypher, m, reply, args, prefix, command, isCreator, mess, db, botNumber, saveDatabase }) => {
    if (!isCreator) return reply(mess.owner);
    if (args.length < 1) return reply(`Example: ${prefix + command} public/private/group/pm\n\nprivate - sets the bot to private mode\npublic - sets the bot to public mode\ngroup - sets the bot to be public on groups alone\npm - sets the bot to be public on personal chats alone.`);

    const validOptions = ["private", "public", "group", "pm"];
    const option = args[0].toLowerCase();

    if (!validOptions.includes(option)) return reply("Invalid option. Use: private, public, group or pm");

    db.settings.mode = option;

    await saveDatabase();

    reply(`Bot mode set to: *${option}*`);
  }
},
{
  command: ['setmenu', 'menustyle', 'changemenu'],
  operate: async ({ reply, args, prefix, command, db, isCreator, mess, saveDatabase }) => {
    if (!isCreator) return reply(mess.owner);
    if (args.length < 1) return reply(`Example: ${prefix + command} 2\n\nOptions:\n1 = Document menu (Android only)\n2 = Text only menu (Android & iOS)\n3 = Image menu with context (Android & iOS)\n4 = Image menu (Android & iOS)\n5 = Footer/faded menu\n6 = Payment menu`);

    const validOptions = ["1", "2", "3", "4", "5", "6"];
    const option = args[0];

    if (!validOptions.includes(option)) return reply("⚠️ Invalid menu style. Use a number between *1-6*.");

    db.settings.menustyle = option;
    reply(`✅ Menu style changed to *${option}* successfully.`);

    await saveDatabase();
  }
},
{
  command: ['setprefix'],
  operate: async ({ reply, args, prefix, command, db, isCreator, mess, saveDatabase }) => {
    if (!isCreator) return reply(mess.owner);
    if (args.length < 1) return reply(`Example: ${prefix + command} !\n\n- This will change the bot prefix to *!*\n\nUse *${prefix + command} none* to use the bot without prefix`);

    let newPrefix = args[0];

    if (newPrefix.toLowerCase() === "none" || newPrefix.toLowerCase() === "noprefix") {
      newPrefix = "";
    } else if (newPrefix.length > 3) {
      return reply("⚠️ Prefix should be 1-3 characters long.");
    }

    db.settings.prefix = newPrefix;
    reply(`✅ Prefix changed to *${newPrefix || "No Prefix"}* successfully.`);

    await saveDatabase();
  }
},
{
  command: ['setstatusemoji', 'statusemoji'],
  operate: async ({ reply, args, prefix, command, db, isCreator, mess, saveDatabase }) => {
    if (!isCreator) return reply(mess.owner);
   if (args.length < 1) {
  return reply(
    `Example:\n` +
    `${prefix + command} 💚\n` +
    `${prefix + command} ❤️,🔥,✨\n\n` +
    `- Use a single emoji or separate multiple emojis with commas.\n` +
    `- These will be used randomly for reacting to status updates.`
  );
}

    const input = args.join(" ");
    const emojis = input.split(',').map(e => e.trim()).filter(e => /^\p{Emoji}$/u.test(e));

    if (!emojis.length) return reply("⚠️ Please provide at least one valid emoji.");

    db.settings.statusemoji = emojis.join(',');
    reply(`✅ Status reaction emojis updated to:\n*${emojis.join(" ")}*`);

    await saveDatabase();
  }
},
{
  command: ['setbotname', 'botname'],
  operate: async ({ reply, args, prefix, command, db, isCreator, mess, saveDatabase }) => {
    if (!isCreator) return reply(mess.owner);
    if (args.length < 1) return reply(`Example: ${prefix + command} CypherX \n\nThis will change the bot's display name`);

    const newName = args.join(" ");
    if (newName.length > 30) return reply("⚠️ Bot name should be 30 characters or less.");

    db.settings.botname = newName;
    reply(`✅ Bot name changed to *${newName}* successfully.`);

    await saveDatabase();
  }
},
{
  command: ['setownername', 'ownername'],
  operate: async ({ reply, args, prefix, command, db, isCreator, mess, saveDatabase }) => {
    if (!isCreator) return reply(mess.owner);
    if (args.length < 1) return reply(`Example: ${prefix + command} Tylor\n\nThis will change the owner's display name`);

    const newName = args.join(" ");
    if (newName.length > 30) return reply("⚠️ Owner name should be 30 characters or less.");

    db.settings.ownername = newName;
    reply(`✅ Owner name changed to *${newName}* successfully.`);

    await saveDatabase();
  }
},
{
  command: ['setfont', 'font'],
  operate: async ({ reply, args, db, saveDatabase }) => {
    if (!args[0]) {
      const fontList = Object.keys(require('../Core/fonts.js')).join(', ');
      return reply(`📜 Available fonts: ${fontList}\nExample: .setfont smallcaps`);
    }

    if (args[0] === 'off') {
      db.settings.fontstyle = false;
      await saveDatabase();
      return reply(`✅ Font styling *disabled*. Messages will use default font.`);
    }

    const fonts = require('../Core/fonts.js');
    const fontName = args[0].toLowerCase();
    if (!fonts[fontName]) return reply(`❌ Invalid font! Use *.setfont* to see options.`);

    db.settings.fontstyle = fontName;
    await saveDatabase();
    reply(`✅ Successfully set font to *${fontName}*.`);
  }
},
{
  command: ['setownernumber', 'ownernumber'],
  operate: async ({ reply, args, prefix, command, db, isCreator, mess, saveDatabase }) => {
    if (!isCreator) return reply(mess.owner);
    if (args.length < 1) return reply(`Example: ${prefix + command} 2547xxxxxxxx\n\nThis will change the owner's number in the database`);

    let newNumber = args[0].replace(/\D/g, '');

    if (newNumber.startsWith('0')) {
      return reply("⚠️ Phone numbers should not start with *0*. Use the full international format (e.g., *254...* instead of *07...*)");
    }

    if (newNumber.length < 5 || newNumber.length > 15) {
      return reply("⚠️ Please provide a valid phone number (5-15 digits)");
    }

    db.settings.ownernumber = newNumber;
    reply(`✅ Owner number changed to *${newNumber}* successfully.`);

    await saveDatabase();
  }
},
{
  command: ['setwatermark', 'watermark'],
  operate: async ({ reply, args, prefix, command, db, isCreator, mess, saveDatabase }) => {
    if (!isCreator) return reply(mess.owner);
    if (args.length < 1) return reply(`Example: ${prefix + command} ©CypherX is on fire!🔥\n\nThis text will appear as a watermark on bot outputs.`);

    const watermark = args.join(" ");
    if (watermark.length > 50) return reply("⚠️ Watermark text should be 50 characters or less.");

    db.settings.watermark = watermark;
    reply(`✅ Watermark set to:\n*${watermark}*`);

    await saveDatabase();
  }
},
{
  command: ['setstickerauthor', 'stickerauthor'],
  operate: async ({ reply, args, prefix, command, db, isCreator, mess, saveDatabase }) => {
    if (!isCreator) return reply(mess.owner);
    if (args.length < 1) return reply(`Example: ${prefix + command} X\n\nThis will be the author name in sticker metadata.`);

    const author = args.join(" ");
    if (author.length > 25) return reply("⚠️ Author name should be 25 characters or less.");

    db.settings.author = author;
    reply(`✅ Sticker author set to:\n*${author}*`);

    await saveDatabase();
  }
},
{
  command: ['setstickerpackname', 'stickerpackname'],
  operate: async ({ reply, args, prefix, command, db, isCreator, mess, saveDatabase }) => {
    if (!isCreator) return reply(mess.owner);
    if (args.length < 1) return reply(`Example: ${prefix + command} Cypher\n\nThis will be the pack name in sticker metadata.`);

    const packname = args.join(" ");
    if (packname.length > 25) return reply("⚠️ Pack name should be 25 characters or less.");

    db.settings.packname = packname;
    reply(`✅ Sticker pack name set to:\n*${packname}*`);

    await saveDatabase();
  }
},
{
  command: ['settimezone', 'timezone'],
  operate: async ({ reply, args, prefix, command, db, isCreator, mess, saveDatabase }) => {
    if (!isCreator) return reply(mess.owner);
    if (args.length < 1) return reply(`Example: ${prefix + command} Africa/Nairobi\n\nSee valid timezones: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones`);

    const timezone = args[0];

    if (!timezone.includes('/') || timezone.length > 30) {
      return reply(`⚠️ Invalid timezone format. Example: *Africa/Nairobi*\n\See valid timezones: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones`);
    }

    db.settings.timezone = timezone;
    reply(`✅ Timezone set to:\n*${timezone}*`);

    await saveDatabase();
  }
},
{
  command: ['setcontextlink', 'contextlink'],
  operate: async ({ reply, args, prefix, command, db, isCreator, mess, saveDatabase }) => {
    if (!isCreator) return reply(mess.owner);
    if (args.length < 1) return reply(`Example: ${prefix + command} https://instagram.com/username\n\nThis link will be used in bot responses.`);

    const link = args[0];

    if (!link.match(/^https?:\/\//i)) {
      return reply("⚠️ Invalid URL. Must start with *http://* or *https://*");
    }

    db.settings.contextlink = link;
    reply(`✅ Profile link set to:\n*${link}*`);

    await saveDatabase();
  }
},
{
  command: ['setmenuimage', 'menuimage'],
  operate: async ({
    m,
    Cypher,
    reply,
    args,
    prefix,
    command,
    db,
    isCreator,
    mess,
    saveDatabase
  }) => {

    if (!isCreator) return reply(mess.owner)

    let imageUrl = null

    const quoted = m.quoted || m.msg?.quoted
    const mime = quoted?.mimetype || quoted?.msg?.mimetype

    // ===== REPLY MEDIA =====
    if (quoted && mime) {
      try {
        imageUrl = await handleMediaUpload(quoted, Cypher, mime)
      } catch (err) {
        console.error(err)
        return reply("❌ Failed to upload the replied media.")
      }
    }

    // ===== URL ARGUMENT =====
    if (!imageUrl && args.length) {

      const input = args.join(" ").trim()

      if (!/^https?:\/\//i.test(input)) {
        return reply("⚠️ Please provide a valid image URL.")
      }

      imageUrl = input
    }

    if (!imageUrl) {
      return reply(
        `Example:\n` +
        `${prefix + command} https://example.com/image.jpg\n\n` +
        `Or reply to an image with:\n` +
        `${prefix + command}`
      )
    }

    db.settings.menuimage = imageUrl

    await saveDatabase()

    reply(`✅ Menu image set to:\n${imageUrl}`)
  }
},
{
  command: ['setanticallmsg', 'anticallmsg'],
  operate: async ({ reply, args, prefix, command, db, isCreator, mess, saveDatabase }) => {
    if (!isCreator) return reply(mess.owner);
    if (args.length < 1) return reply(`Example: ${prefix + command} Please don't call me. Message me instead!\n\nYou can use placeholders:\n{user} - to automatically mention caller\n{calltype} - To automatically show call type (audio/video)\n\nExample of placeholders usage: ${prefix + command}Hey {user} Please don't {calltype} call me. Message me instead! => Will appear as something like this: Hey @Tylor Please don't video call me. Message me instead!`);

    const newMsg = args.join(" ");
    if (newMsg.length > 500) return reply("⚠️ Message should be 500 characters or less.");

    db.settings.anticallmsg = newMsg;
    reply(`✅ Anti-call message set successfully:\n\n${newMsg}`);

    await saveDatabase();
  }
},
{
  command: ['showanticallmsg', 'getanticallmsg'],
  operate: async ({ reply, db }) => {
    if (!db.settings.anticallmsg || db.settings.anticallmsg.trim() === "") {
      return reply("ℹ️ No custom anti-call message is set. Using default message.");
    }
    
    reply(`📝 Current anti-call message:\n\n${db.settings.anticallmsg}\n\nPlaceholders:\n{user} - caller's username\n{calltype} - call type (audio/video)`);
  }
},
{
  command: ['delanticallmsg', 'deleteanticallmsg', 'resetanticallmsg'],
  operate: async ({ reply, db, isCreator, mess, saveDatabase }) => {
    if (!isCreator) return reply(mess.owner);
    
    if (!db.settings.anticallmsg || db.settings.anticallmsg.trim() === "") {
      return reply("ℹ️ No custom anti-call message is set to delete.");
    }
    
    db.settings.anticallmsg = "";
    reply("✅ Anti-call message has been reset to default.");
    
    await saveDatabase();
  }
},
{
  command: ['testanticallmsg'],
  operate: async ({ reply, db, sender }) => {
    if (!db.settings.anticallmsg || db.settings.anticallmsg.trim() === "") {
      return reply("ℹ️ No custom anti-call message is set. Using default message would look like:\n\n" + 
                  `🚨 *𝙲𝙰𝙻𝙻 𝙳𝙴𝚃𝙴𝙲𝚃𝙴𝙳!* 🚨\n\n` + 
                  `@${sender.split('@')[0]}, my owner cannot receive audio calls at the moment.\n\n` +
                  `⚠️ Your call has been *declined*. Please avoid calling.`);
    }
    
    const testMsg = db.settings.anticallmsg
      .replace(/{user}/g, `@${sender.split('@')[0]}`)
      .replace(/{calltype}/g, 'audio');
    
    reply(`🔧 Test anti-call message (audio call example):\n\n${testMsg}`);
  }
},
{
  command: ['setwelcome', 'welcomemsg'],
  operate: async ({ reply, args, prefix, command, db, isCreator, mess, saveDatabase }) => {
    if (!isCreator) return reply(mess.owner);
    if (args.length < 1) return reply(
      `Example: ${prefix + command} ✨ Welcome {user} to {group}! You are member #{count}\n\n` +
      `Placeholders:\n{user} - mentions user\n{group} - group name\n{count} - total members`
    );

    const newMsg = args.join(" ");
    if (newMsg.length > 500) return reply("⚠️ Message should be 500 characters or less.");

    db.settings.welcomemsg = newMsg;
    reply(`✅ Custom *welcome message* set successfully:\n\n${newMsg}`);
    await saveDatabase();
  }
},
{
  command: ['showwelcome', 'getwelcome'],
  operate: async ({ reply, db }) => {
    if (!db.settings.welcomemsg || db.settings.welcomemsg.trim() === "") {
      return reply("ℹ️ No custom welcome message is set. Using default message.");
    }
    reply(`📝 Current welcome message:\n\n${db.settings.welcomemsg}\n\nPlaceholders:\n{user}, {group}, {count}`);
  }
},
{
  command: ['delwelcome', 'deletewelcome', 'resetwelcome'],
  operate: async ({ reply, db, isCreator, mess, saveDatabase }) => {
    if (!isCreator) return reply(mess.owner);
    if (!db.settings.welcomemsg || db.settings.welcomemsg.trim() === "") {
      return reply("ℹ️ No custom welcome message is set to delete.");
    }
    db.settings.welcomemsg = "";
    reply("✅ Welcome message has been reset to default.");
    await saveDatabase();
  }
},
{
  command: ['testwelcome'],
  operate: async ({ reply, db, sender }) => {
    const groupName = "Test Group";
    const memberCount = 123;
    let msg;

    if (!db.settings.welcomemsg || db.settings.welcomemsg.trim() === "") {
      msg = `✨ Welcome @${sender.split('@')[0]} to ${groupName}! (Member #${memberCount})`;
    } else {
      msg = db.settings.welcomemsg
        .replace(/{user}/g, `@${sender.split('@')[0]}`)
        .replace(/{group}/g, groupName)
        .replace(/{count}/g, memberCount);
    }

    reply(`🔧 Test welcome message:\n\n${msg}`);
  }
},
{
  command: ['setgoodbye', 'goodbyemsg'],
  operate: async ({ reply, args, prefix, command, db, isCreator, mess, saveDatabase }) => {
    if (!isCreator) return reply(mess.owner);
    if (args.length < 1) return reply(
      `Example: ${prefix + command} 😢 Goodbye {user}! We're now {count} members left in {group}.\n\n` +
      `Placeholders:\n{user} - mentions user\n{group} - group name\n{count} - total members`
    );

    const newMsg = args.join(" ");
    if (newMsg.length > 500) return reply("⚠️ Message should be 500 characters or less.");

    db.settings.goodbyemsg = newMsg;
    reply(`✅ Custom *goodbye message* set successfully:\n\n${newMsg}`);
    await saveDatabase();
  }
},
{
  command: ['showgoodbye', 'getgoodbye'],
  operate: async ({ reply, db }) => {
    if (!db.settings.goodbyemsg || db.settings.goodbyemsg.trim() === "") {
      return reply("ℹ️ No custom goodbye message is set. Using default message.");
    }
    reply(`📝 Current goodbye message:\n\n${db.settings.goodbyemsg}\n\nPlaceholders:\n{user}, {group}, {count}`);
  }
},
{
  command: ['delgoodbye', 'deletegoodbye', 'resetgoodbye'],
  operate: async ({ reply, db, isCreator, mess, saveDatabase }) => {
    if (!isCreator) return reply(mess.owner);
    if (!db.settings.goodbyemsg || db.settings.goodbyemsg.trim() === "") {
      return reply("ℹ️ No custom goodbye message is set to delete.");
    }
    db.settings.goodbyemsg = "";
    reply("✅ Goodbye message has been reset to default.");
    await saveDatabase();
  }
},
{
  command: ['testgoodbye'],
  operate: async ({ reply, db, sender }) => {
    const groupName = "Test Group";
    const memberCount = 123;
    let msg;

    if (!db.settings.goodbyemsg || db.settings.goodbyemsg.trim() === "") {
      msg = `😢 Goodbye @${sender.split('@')[0]}! We're now ${memberCount} members in ${groupName}.`;
    } else {
      msg = db.settings.goodbyemsg
        .replace(/{user}/g, `@${sender.split('@')[0]}`)
        .replace(/{group}/g, groupName)
        .replace(/{count}/g, memberCount);
    }

    reply(`🔧 Test goodbye message:\n\n${msg}`);
  }
},
{
  command: ['getsettings'],
  operate: async ({ reply, db }) => {
    const settings = db.settings;
    
    let message = "⚙️ *Current Bot Settings:*\n\n";
    for (const [key, value] of Object.entries(settings)) {
        message += `🔸 *${key}*: ${typeof value === "boolean" ? (value ? "ON" : "OFF") : value}\n`;
    }

    reply(message);
  }
},
{
    command: ['resetwarn'],
    operate: async ({ m, db, from, isAdmins, isCreator, isBotAdmins, reply, Cypher, mess }) => {

        let isGroup = from.endsWith("@g.us");
        if (isGroup && !isBotAdmins) return reply(mess.admin);
        if (!isAdmins && !isCreator) return reply(mess.notadmin);

        let user = m.mentionedJid && m.mentionedJid[0] || (m.quoted ? m.quoted.sender : null);
        if (!user) return reply("*Mention a user or reply to their message to reset their warnings.*");

        let targetDB = isGroup ? db.chats[from] : db.settings;

        if (!targetDB.warnings || !targetDB.warnings[user]) return reply("*User has no warnings to reset.*");

        delete targetDB.warnings[user];

        await Cypher.sendMessage(from, {
            text: `✅ *Warnings for @${user.split("@")[0]} have been reset!*`,
            contextInfo: { mentionedJid: [user] },
        }, { quoted: m });
    }
},
{
    command: ['setwarn'],
    operate: async ({ m, db, from, isAdmins, isCreator, isBotAdmins, args, reply, mess }) => {

        let isGroup = from.endsWith("@g.us");
        if (isGroup && !isBotAdmins) return reply(mess.admin);
        if (!isAdmins && !isCreator) return reply(mess.notadmin);

        let limit = parseInt(args[0]);
        if (!limit || isNaN(limit) || limit < 1) return reply("*Please provide a valid warn limit (minimum 1).*");

        let targetDB = isGroup ? db.chats[from] : db.settings;
        targetDB.warnLimit = limit;

        reply(`✅ *Warn limit set to ${limit}.*`);
    }
},
{
    command: ['listwarn'],
    operate: async ({ m, db, from, reply, Cypher }) => {

        let isGroup = from.endsWith("@g.us");
        let targetDB = isGroup ? db.chats[from] : db.settings;
        let warnLimit = targetDB.warnLimit || 5;
        let warnings = targetDB.warnings || {};

        if (Object.keys(warnings).length === 0) return reply("*No users have been warned.*");

        let warnList = Object.entries(warnings)
            .map(([user, count]) => `@${user.split("@")[0]} - ${count} warns left`)
            .join("\n");

        await Cypher.sendMessage(from, {
            text: `⚠️ *Warn Limit: ${warnLimit}*\n\n${warnList}`,
            contextInfo: { mentionedJid: Object.keys(warnings) },
        }, { quoted: m });
    }
},
{
  command: ['antiviewonce', 'avo'],
  operate: async ({ Cypher, m, reply, args, prefix, command, isCreator, mess, db, saveDatabase }) => {
    if (!isCreator) return reply(mess.owner);

    const modeArg = (args?.[0] || '').toLowerCase();
    const valid = ['all', 'pm', 'group', 'off'];

    if (!modeArg) {
      const current = db?.settings?.antiviewonce || 'off';
      return reply(`Usage: ${prefix + command} all/pm/group/off\nCurrent: ${current}`);
    }

    if (!valid.includes(modeArg)) return reply('Invalid option. Use: all, pm, group, off');

    db.settings.antiviewonce = modeArg;
    await saveDatabase();

    if (modeArg === 'off') {
      return reply('Anti-view-once Status disabled successfully');
    }

    const label =
      modeArg === 'all' ? 'All chats' :
      modeArg === 'pm' ? 'Private chats' :
      'Groups';

    return reply(`Anti-view-once mode set to: ${label}`);
  }
},
{
  command: ['resetsetting'],
  operate: async ({ reply, args, prefix, command, db, isCreator }) => {
    if (!isCreator) return reply("Only the owner can reset settings.");
    if (args.length < 1) return reply(`Example: ${prefix + command} <setting/all>\n\n- Use *all* to reset all settings.\n- Use a specific setting name to reset only that.`);

    const settingToReset = args[0].toLowerCase();
    const defaultSettings = {
        prefix: ".",
        mode: "public",
        autobio: false,
        anticall: false,
        chatbot: false,
        antibug: false,
        autotype: false,
        autoread: false,
        fontstyle: false,   
        antiedit: "private",
        menustyle: "2",
        autoreact: false,
        autoblock: false,
        autorecord: false,
        antidelete: "private",
        alwaysonline: true,
        warnings: {},
        warnLimit: 5,
        autoviewstatus: true,
        autoreactstatus: false,
        autorecordtype: false,
        statusantidelete: true, 
        botname: "CypherX",
        ownername: "Not Set!",
        ownernumber: "2540000000",
        statusemoji: "🧡,💚,🔥,✨,❤️,🥰,😎",
        watermark: "©CypherX is on fire!🔥",
        author: "X",
        packname: "Cypher",
        timezone: "Africa/Nairobi",
        contextlink: "https://www.instagram.com/heyits_tylor?igsh=YzljYTk1ODg3Zg---",
        menuimage: "",
        anticallmsg: "",
      antisticker: false,
      antistickerkick: false,
      antistickerwarn: false,

      bankInfo: {
        holderName: "",
        bankName: "",
        accountNumber: "",
      },
        allowedCodes: [],
        stickerAliases: {},
    };

    if (settingToReset === "all") {
        db.settings = { ...defaultSettings };
        reply("✅ All settings have been reset to default.");
    } else if (settingToReset in defaultSettings) {
        db.settings[settingToReset] = defaultSettings[settingToReset];
        reply(`✅ *${settingToReset}* has been reset to *${defaultSettings[settingToReset]}*.`);
    } else {
        reply(`⚠️ Invalid setting name. Use *${prefix + command} all* to reset everything or provide a valid setting name.`);
    }

    await saveDatabase();
  }
},
{
  command: ['statusdelay', 'setstatusdelay'],
  operate: async ({ reply, args, prefix, command, isCreator, mess, db, saveDatabase }) => {

    if (!isCreator) return reply(mess.owner);

    if (args.length < 1) {
      return reply(`Examples:
${prefix + command} 5s
${prefix + command} 10s
${prefix + command} 1m
${prefix + command} 5-15s
${prefix + command} 1-5m`);
    }

    const input = args[0].toLowerCase();

    const valid =
      /^\d+(s|m)$/.test(input) ||
      /^\d+-\d+(s|m)$/.test(input);

    if (!valid) {
      return reply("Invalid format.\nUse: 5s, 10s, 1m, 5-15s, 1-5m");
    }

    db.settings.statusDelay = input;

    await saveDatabase();

    reply(`Status delay set to ${input}`);
  }
},
{
  command: ['statussettings', 'statusconfig'],
  operate: async ({ reply, db }) => {

    const settings = db.settings;

    const text = `📊 *Status Automation Settings*

👁 Auto View:
${settings.autoviewstatus ? "Enabled" : "Disabled"}

❤️ Auto React:
${settings.autoreactstatus ? "Enabled" : "Disabled"}

⏱ Reaction Delay:
${settings.statusDelay || "5s"}

😀 Reaction Emojis:
${settings.statusemoji || "💚"}

💾 Auto Save Mode:
${settings.autosavestatus || "off"}

🚫 Blacklist Count:
${(settings.statusBlacklist || []).length}
`;

    reply(text);
  }
}
];