const config = {
    name: "help",
    _name: {
        "ar_SY": "الاوامر"
    },
    aliases: ["cmds", "commands"],
    version: "1.0.3",
    description: "Show all commands or command details",
    usage: "[command] (optional)",
    credits: "XaviaTeam"
}

const langData = {
    "en_US": {
        "help.list": "{list}\n\n⇒ Total: {total} commands\n⇒ Use {syntax} [command] to get more information about a command.",
        "help.commandNotExists": "Command {command} does not exists.",
        "help.commandDetails": `
            ⇒ Name: {name}
            ⇒ Aliases: {aliases}
            ⇒ Version: {version}
            ⇒ Description: {description}
            ⇒ Usage: {usage}
            ⇒ Permissions: {permissions}
            ⇒ Category: {category}
            ⇒ Cooldown: {cooldown}
            ⇒ Credits: {credits}
        `,
        "0": "Member",
        "1": "Group Admin",
        "2": "Bot Admin"
    },
    "vi_VN": {
        "help.list": "{list}\n\n⇒ Tổng cộng: {total} lệnh\n⇒ Sử dụng {syntax} [lệnh] để xem thêm thông tin về lệnh.",
        "help.commandNotExists": "Lệnh {command} không tồn tại.",
        "help.commandDetails": `
            ⇒ Tên: {name}
            ⇒ Tên khác: {aliases}
            ⇒ Phiên bản: {version}
            ⇒ Mô tả: {description}
            ⇒ Cách sử dụng: {usage}
            ⇒ Quyền hạn: {permissions}
            ⇒ Thể loại: {category}
            ⇒ Thời gian chờ: {cooldown}
            ⇒ Người viết: {credits}
        `,
        "0": "Thành viên",
        "1": "Quản trị nhóm",
        "2": "Quản trị bot"
    },
    "ar_SY": {
        "help.list": "{list}\n\n⇒ المجموع: {total} الاوامر\n⇒ يستخدم {syntax} [امر] لمزيد من المعلومات حول الأمر.",
        "help.commandNotExists": "امر {command} غير موجود.",
        "help.commandDetails": `
            ⇒ اسم: {name}
            ⇒ اسم مستعار: {aliases}
            ⇒ وصف: {description}
            ⇒ استعمال: {usage}
            ⇒ الصلاحيات: {permissions}
            ⇒ فئة: {category}
            ⇒ وقت الانتظار: {cooldown}
            ⇒ الاعتمادات: {credits}
        `,
        "0": "عضو",
        "1": "إدارة المجموعة",
        "2": "ادارة البوت"
    }
}

function getCommandName(commandName) {
    if (global.plugins.commandsAliases.has(commandName)) return commandName;

    for (let [key, value] of global.plugins.commandsAliases) {
        if (value.includes(commandName)) return key;
    }

    return null
}

async function onCall({ message, args, getLang, userPermissions, prefix }) {
    const { commandsConfig } = global.plugins;
    const commandName = args[0]?.toLowerCase();

    if (!commandName) {
        let commands = {};
        const language = data?.thread?.data?.language || global.config.LANGUAGE || 'en_US';
        for (const [key, value] of commandsConfig.entries()) {
            if (!!value.isHidden) continue;
            if (!!value.isAbsolute ? !global.config?.ABSOLUTES.some(e => e == message.senderID) : false) continue;
            if (!value.hasOwnProperty("permissions")) value.permissions = [0, 1, 2];
            if (!value.permissions.some(p => userPermissions.includes(p))) continue;
            if (!commands.hasOwnProperty(value.category)) commands[value.category] = [];
            commands[value.category].push(value._name && value._name[language] ? value._name[language] : key);
        }

        // Fonction pour ajouter correctement le symbole │ à chaque commande par paire
        const formatCommands = (commandList) => {
            let formatted = [];
            for (let i = 0; i < commandList.length; i += 2) {
                // Grouper deux commandes par ligne
                let line = `⦿ ${commandList[i]}` + (commandList[i + 1] ? ` ⦿ ${commandList[i + 1]}` : '');
                formatted.push(line);
            }
            return formatted.join("\n│ "); // Rejoindre avec le séparateur et retour à la ligne
        };

        let list = Object.keys(commands)
            .map(category => {
                let categoryTitle = `╭ ❍『 ${category.toUpperCase()} 』`;
                let commandList = `│ ${formatCommands(commands[category])}`; // Appeler la fonction pour formater les commandes
                return `${categoryTitle}\n${commandList}\n╰───────────⎔`;
            })
            .join("\n\n");

        let finalMessage = `
╚» 𝗖𝗢𝗠𝗠𝗔𝗡𝗗𝗘𝗦 «╝
             ━━━⌾━━━
${list}
             ━━━⌾━━━
✘ 𝙉𝙤𝙢𝙗𝙧𝙚𝙨 𝙙𝙚 𝘾𝙢𝙙𝙨:「${Object.values(commands).map(e => e.length).reduce((a, b) => a + b, 0)}」
☁️ 𝘛𝘢𝘱𝘦 ${prefix}Help [𝙽𝚘𝚖 𝚍𝚎 𝚕𝚊 𝚌𝚖𝚍] 𝘱𝘰𝘶𝘳 𝘷𝘰𝘪𝘳 𝘤𝘰𝘮𝘮𝘦𝘯𝘵 𝘶𝘵𝘪𝘭𝘪𝘴𝘦𝘳 𝘶𝘯𝘦 𝘤𝘰𝘮𝘮𝘢𝘯𝘥𝘦.
✘ 𝗣𝗿𝗲𝗳𝗶𝘅  ⇛ ${prefix} ⇚
        `.trim();

        message.reply(finalMessage);
    } else {
        const command = commandsConfig.get(getCommandName(commandName, commandsConfig));
        if (!command) return message.reply(getLang("help.commandNotExists", { command: commandName }));

        const isHidden = !!command.isHidden;
        const isUserValid = !!command.isAbsolute ? global.config?.ABSOLUTES.some(e => e == message.senderID) : true;
        const isPermissionValid = command.permissions.some(p => userPermissions.includes(p));
        if (isHidden || !isUserValid || !isPermissionValid)
            return message.reply(getLang("help.commandNotExists", { command: commandName }));

        message.reply(getLang("help.commandDetails", {
            name: command.name,
            aliases: command.aliases.join(", "),
            version: command.version || "1.0.0",
            description: command.description || '',
            usage: `${prefix}${commandName} ${command.usage || ''}`,
            permissions: command.permissions.map(p => getLang(String(p))).join(", "),
            category: command.category,
            cooldown: command.cooldown || 3,
            credits: command.credits || ""
        }).replace(/^ +/gm, ''));
    }
}
export default {
    config,
    langData,
    onCall
}
