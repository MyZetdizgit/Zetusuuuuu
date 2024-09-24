import { statSync, createWriteStream, existsSync, mkdirSync, createReadStream } from 'fs';
import { join } from 'path';
import axios from 'axios';

const config = {
    name: "art",
    aliases: [],
    version: "1.1",
    description: "Generate an image based on a prompt and an initial image.",
    usage: "[imageUrl prompt --model modelIndex]",
    credits: "Zetssu",
    cooldown: 5
};

const langData = {
    "en_US": {
        "invalidModel": "❌ | Invalid model number!",
        "missingImage": "❌ | You must reply to an image or provide an image URL.",
        "guide": "◉ 𝐆𝐔𝐈𝐃𝐄 𝐀𝐑𝐓 :\n\n(Reply to an image) 𝘼𝙧𝙩 𝘱𝘳𝘰𝘮𝘱𝘵 --model (0-64)\n\n◉ 𝐅𝐨𝐫 𝐦𝐨𝐝𝐞𝐥𝐬 𝐥𝐢𝐬𝐭: \n [𝘼𝙧𝙩 𝙢𝙤𝙙𝙚𝐥]",
        "modelsList": "◉ 𝐌𝐎𝐃𝐄𝐋𝐒 𝐀𝐑𝐓 𝐀𝐕𝐀𝐈𝐋𝐀𝐁𝐋𝐄 ◉\n\n0 | 3Guofeng3\n1 | Absolutereality_V16\n...\n64 | Aniverse_v30",
        "generationFailed": "❌ | Failed to generate image.",
        "success": "✅ | Image generated successfully!"
    }
};

async function generateImage({ imageUrl, prompt, modelIndex, width, height }) {
    const apiUrl = `https://zetart-igub.onrender.com/generate?imageUrl=${encodeURIComponent(imageUrl)}&prompt=${encodeURIComponent(prompt)}&modelIndex=${modelIndex}&width=${width}&height=${height}`;
    try {
        const response = await axios.get(apiUrl, { responseType: "stream" });
        return response.data;
    } catch (error) {
        console.error("API Error:", error);
        return null;
    }
}

async function onCall({ message, args, getLang, api, event }) {
    let imageUrl = "";
    let prompt = "same picture";
    let modelIndex = 62;
    let width = 1024;
    let height = 1024;
    let cachePath;

    try {
        if (args.length > 0) {
            prompt = args.join(" ");
            const modelArgIndex = args.indexOf("--model");
            if (modelArgIndex !== -1) {
                modelIndex = parseInt(args[modelArgIndex + 1], 10);
            }
        }

        if (prompt.toLowerCase() === "guide") return message.reply(getLang('guide'));
        if (prompt.toLowerCase() === "model") return message.reply(getLang('modelsList'));

        if (event.type === "message_reply" && message.messageReply.attachments?.[0]?.type === "photo") {
            imageUrl = message.messageReply.attachments[0].url;
            width = message.messageReply.attachments[0].width;
            height = message.messageReply.attachments[0].height;

            if (width > 1024 || height > 1024) {
                const aspectRatio = width / height;
                width = width > height ? 1024 : Math.floor(1024 * aspectRatio);
                height = height > width ? 1024 : Math.floor(1024 / aspectRatio);
            }
        } else if (args[0]?.match(/(https?:\/\/.*\.(?:png|jpg|jpeg))/g)) {
            imageUrl = args[0];
        } else {
            return message.reply(getLang('missingImage'));
        }

        if (isNaN(modelIndex) || modelIndex < 0 || modelIndex >= 65) {
            return message.reply(getLang('invalidModel'));
        }

        cachePath = join(global.cachePath, `generated_${message.senderID}${Date.now()}.png`);
        const imageStream = await generateImage({ imageUrl, prompt, modelIndex, width, height });

        if (!imageStream) {
            return message.reply(getLang('generationFailed'));
        }

        const writer = createWriteStream(cachePath);
        imageStream.pipe(writer);

        writer.on("finish", async () => {
            message.react("✅");
            await message.reply({ body: getLang('success'), attachment: createReadStream(cachePath) });
        });

        writer.on("error", (err) => {
            console.error("Stream error:", err);
            message.reply(getLang('generationFailed'));
        });
    } catch (error) {
        console.error("Error:", error);
        message.react("❌");
        message.reply(getLang('generationFailed'));
    } finally {
        if (existsSync(cachePath)) {
            global.deleteFile(cachePath);
        }
    }
}

export default {
    config,
    langData,
    onCall
};
