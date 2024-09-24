import { createWriteStream, statSync } from 'fs';
import { join } from 'path';
import axios from 'axios';
import tinyurl from 'tinyurl';

const _48MB = 48 * 1024 * 1024;

const config = {
    name: "xx",
    version: "2.0",
    description: "Generate unique images using a specified model",
    usage: "{pn} <prompt> [-r <ratio>] [-m <modelIndex>] [-st <steps>] [-c <cfg_scale>] [-l <lora:weight>] [-s <seed>]",
    credits: "Zetsu",
    cooldown: 5
};

const langData = {
    "en_US": {
        "error": "An error occurred. Please try again later.",
        "generationInProgress": "🖌️ 𝑃𝑙𝑠 𝑤𝑎𝑖𝑡...",
        "fileTooLarge": "File is too large, max size is 48MB",
        "imageReady": "𝑉𝑜𝑖𝑐𝑖 𝑣𝑜𝑡𝑟𝑒 𝐼𝑚𝑎𝑔𝑒 🌟\n 𝑳𝒊𝒆𝒏 𝟒𝒌 ✨: \n"
    }
};

async function generateImage({ prompt, ratio = '13:19', modelIndex = 1, steps, cfg_scale, seed = -1, loraWeights = {} }) {
    let loraString = Object.entries(loraWeights)
        .map(([key, weight]) => `${key}:${weight}`)
        .join(',');

    const apiUrl = `https://zetsdq.onrender.com/generate-image?prompt=${encodeURIComponent(prompt)}&modelIndex=${modelIndex}&sampler=Euler%20a&ratio=${ratio}`
        + (steps !== undefined ? `&steps=${steps}` : '')
        + (cfg_scale !== undefined ? `&cfg_scale=${cfg_scale}` : '')
        + (loraString ? `&loras=${encodeURIComponent(loraString)}` : '')
        + (seed !== -1 ? `&seed=${seed}` : '');

    const response = await axios.get(apiUrl);
    return response.data.imageUrl;
}

async function downloadImage(imageUrl, cachePath) {
    const imageStream = createWriteStream(cachePath);
    const response = await axios.get(imageUrl, { responseType: 'stream' });
    response.data.pipe(imageStream);

    return new Promise((resolve, reject) => {
        imageStream.on('finish', () => resolve(true));
        imageStream.on('error', (err) => reject(err));
    });
}

async function onCall({ message, args, getLang }) {
    let prompt = '';
    let ratio = '13:19';
    let modelIndex = 1;
    let steps, cfg_scale, seed = -1;
    let loraWeights = {};

    try {
        // Parsing arguments
        for (let i = 0; i < args.length; i++) {
            if (args[i] === '-r') {
                ratio = args[i + 1];
                i++;
            } else if (args[i] === '-m') {
                modelIndex = parseInt(args[i + 1], 10);
                i++;
            } else if (args[i] === '-st') {
                steps = parseInt(args[i + 1], 10);
                i++;
            } else if (args[i] === '-c') {
                cfg_scale = parseInt(args[i + 1], 10);
                i++;
            } else if (args[i] === '-s') {
                seed = parseInt(args[i + 1], 10);
                i++;
            } else if (args[i] === '-l') {
                const loraEntries = args[i + 1].split(',');
                loraEntries.forEach((entry, index) => {
                    const [num, weight] = entry.split(':');
                    loraWeights[num.trim()] = weight ? weight.trim() : (loraEntries.length - index).toString();
                });
                i++;
            } else {
                prompt += args[i] + ' ';
            }
        }

        // Gestion des commandes spéciales
        const guideMessage = "𝐆𝐔𝐈𝐃𝐄 𝐗𝐗 :\n\n➨ 𝙓𝙭 𝘱𝘳𝘰𝘮𝘱𝘵 -𝙧 𝘳𝘢𝘵𝘪𝘰 -𝙢 𝘮𝘰𝘥𝘦𝘭 -𝙨𝙩 𝘴𝘵𝘦𝘱𝘴(𝟭-𝟯𝟱) -𝙡 𝘭𝘰𝘳𝘢1,𝘭𝘰𝘳𝘢2 -𝙘 𝘤𝘧𝘨_𝘴𝘤𝘢𝘭𝘦 -𝙨 𝘴𝘦𝘦𝘥 \n\n ◉ 𝐄𝐱𝐞𝐦𝐩𝐥𝐞 : Xx un chat surfant sur un tsunami -r 4:7 -m 2 -st 30 -l 4,1 -c 7 -s -1\n\n◉ 𝘗𝘰𝘶𝘳 𝘷𝘰𝘪𝘳 𝘭𝘦𝘴 𝘳𝘢𝘵𝘪𝘰𝘴 𝘥𝘪𝘴𝘱𝘰𝘯𝘪𝘣𝘭𝘦𝘴 : \n➨ 𝙓𝙭 𝙧𝙖𝙩𝙞𝙤\n\n◉ 𝘗𝘰𝘶𝘳 𝘷𝘰𝘪𝘳 𝘭𝘦𝘴 𝘮𝘰𝘥𝘦𝘭𝘴 𝘥𝘪𝘴𝘱𝘰𝘯𝘪𝘣𝘭𝘦𝘴 : \n➨ 𝙓𝙭 𝙢𝙤𝙙𝙚𝙡\n\n◉ 𝘗𝘰𝘶𝘳 𝘷𝘰𝘪𝘳 𝘭𝘦𝘴 𝘭𝘰𝘳𝘢𝘴 𝘥𝘪𝘴𝘱𝘰𝘯𝘪𝘣𝘭𝘦𝘴 : \n➨ 𝙓𝙭 𝙡𝙤𝙧𝙖";

        if (!prompt.trim()) {
            return message.reply(guideMessage);
        }

        if (prompt.toLowerCase().trim() === "guide") {
            return message.reply(guideMessage);
        }

        if (prompt.toLowerCase().trim() === "ratio") {
            const usim = "◉ 𝐃𝐈𝐌𝐄𝐍𝐒𝐈𝐎𝐍𝐒 𝐗𝐗◉ \n\n✧ 𝟑:𝟐 \n✧ 𝟐:𝟑\n✧ 𝟕:𝟒 \n✧ 𝟒:𝟕\n✧ 𝟏:𝟏\n✧ 𝟕:𝟗 \n✧ 𝟗:𝟕\n✧ 𝟏𝟗:𝟏𝟑\n✧ 𝟏𝟑:𝟏𝟗\n✧ 𝟏𝟐:𝟓\n✧ 𝟓:𝟏𝟐";
            return message.reply(usim);
        }

        if (prompt.toLowerCase().trim() === "model") {
            const modelGuide = "◉ 𝐌𝐎𝐃𝐄𝐋𝐄𝐒 𝐗𝐗 ◉ \n\n✧ 𝐒𝐃𝐗𝐋 ✧ \n𝟏: 𝐴𝑛𝑖𝑚𝑎𝑔𝑖𝑛𝑒 𝑋𝐿 - 3.1\n𝟐: 𝐴𝑛𝑖𝑚𝑎𝑔𝑖𝑛𝑒 𝑋𝐿 - 𝑉3\n𝟑: 4𝑡ℎ 𝑇𝑎𝑖𝑙 𝐴𝑛𝑖𝑚𝑒 𝐻𝑒𝑛𝑡𝑎𝑖\n𝟒: 𝑆𝑡𝑎𝑏𝑙𝑒 𝑑𝑖𝑓𝑓𝑢𝑠𝑖𝑜𝑛 𝑋𝐿 - 1.0";
            return message.reply(modelGuide);
        }

        if (prompt.toLowerCase().trim() === "lora") {
            const loraGuide = "◉ 𝐋𝐨𝐫𝐚𝐬 𝐝𝐢𝐬𝐩𝐨𝐧𝐢𝐛𝐥𝐞𝐬 ✧\n\n𝟏: 𝑳𝒐𝒓𝒂 𝑬𝒅𝒈𝒆𝒅 𝑨𝒏𝒊𝒎𝒆\n𝟐: 𝑳𝒐𝒓𝒂 𝑶𝒓𝒄 𝑯𝒆𝒏𝒕𝒂𝒊\n𝟑: 𝑳𝒐𝒓𝒂 𝑨𝒏𝒊𝒎𝒆 𝑻𝒓𝒂𝒏𝒔𝒇𝒐𝒓𝒎";
            return message.reply(loraGuide);
        }

        // Send generation message
        const lang = getLang();
        const generationInProgress = langData[lang]["generationInProgress"];
        const reply = await message.reply(generationInProgress);

        const cachePath = join(__dirname, 'cache', `${Date.now()}.jpg`);
        const imageUrl = await generateImage({ prompt, ratio, modelIndex, steps, cfg_scale, seed, loraWeights });

        // Download the image
        await downloadImage(imageUrl, cachePath);

        const stats = statSync(cachePath);
        if (stats.size > _48MB) {
            return reply.reply(langData[lang]["fileTooLarge"]);
        }

        const url = await tinyurl.shorten(imageUrl);
        return reply.reply(`${langData[lang]["imageReady"]} ${url}`);
    } catch (err) {
        console.error(err);
        return message.reply(langData["en_US"]["error"]);
    }
}

export default {
    config,
    onCall
};
