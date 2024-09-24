const langData = {
    "en_US": {
        "prefix.get": "┏𝙋𝙍𝙀𝙁𝙄𝙓 : ⇛ {prefix} ⇚\n☁️ 𝘛𝘢𝘱𝘦 {prefix} 𝘩𝘦𝘭𝘱 𝘱𝘰𝘶𝘳 𝘷𝘰𝘪𝘳 𝘭𝘦𝘴 𝘤𝘰𝘮𝘮𝘢𝘯𝘥𝘦𝘴 𝘥𝘪𝘴𝘱𝘰𝘯𝘪𝘣𝘭𝘦𝘴\n┗━━━━⌾\n                  ━━◊━━     \n 𝗭𝗲𝘁-𝗫 𝗽𝗼𝘂𝗿 𝘃𝗼𝘂𝘀 𝗦𝗲𝗿𝘃𝗶𝗿"
    },
    "vi_VN": {
        "prefix.get": "Prefix hiện tại là: {prefix}"
    }
}

function onCall({ message, getLang, data }) {
    if (message.body == "Prefix" && message.senderID != global.botID) {
        message.reply(getLang("prefix.get", {
            prefix: data?.thread?.data?.prefix || global.config.PREFIX
        }));
    }

    return;
}

export default {
    langData,
    onCall
}
