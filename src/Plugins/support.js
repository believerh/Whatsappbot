module.exports = [
  {
    command: ['feedback'],
    operate: async ({ m, mess, text, Cypher, isCreator, versions, prefix, command, reply, sendToTelegram }) => {
      if (!isCreator) return reply(mess.owner);
      if (!text) return reply(`Example: ${prefix + command} Hey dev, this bot is very awesome🔥`);

      const bugReportMsg = `
*USER FEEDBACK*

*User:* @${m.sender.split("@")[0]}
*Feedback:* ${text}

*Version:* ${versions}
      `;

      const confirmationMsg = `
Hi ${m.pushName},

Thanks for sharing your feedback with us. `;

      await sendToTelegram(bugReportMsg);
      Cypher.sendMessage(m.chat, { text: confirmationMsg, mentions: [m.sender] }, { quoted: m });
    }
  },
{
  command: ["helpers", "support"],
  operate: async ({ m, args, reply }) => {
    const search = args.join(" ").toLowerCase();

    const filtered = global.helpersList.filter(helper =>
      !search || helper.country.toLowerCase().includes(search)
    );

    if (!filtered.length) {
      return reply(`❌ No helper found for "${search}".\nTry using: *.helpers* to see all.`);
    }

    filtered.sort((a, b) => a.country.localeCompare(b.country));

    let text = `*🌍 CypherX Verified Helpers*\n\n`;
    filtered.forEach((helper, index) => {
      text += `${index + 1}. ${helper.flag} *${helper.country}*\n   • ${helper.name}: ${helper.number}\n\n`;
    });

    text += `✅ CypherX Team\n`;
    text += `📢 Need general help? Join our support group:\n👉 https://t.me/cypherx_support\n`;
    text += `⚠️ Charges may apply depending on the service provided.`;

    reply(text);
  }
}
]