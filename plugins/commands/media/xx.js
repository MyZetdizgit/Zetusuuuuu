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
        // Inform the user about image generation
        message.reply(getLang('generationInProgress'));

        // Generate image
        const imageUrl = await generateImage({ prompt, ratio, modelIndex, steps, cfg_scale, seed, loraWeights });

        // Shorten URL with TinyURL
        const shortUrl = await tinyurl.shorten(imageUrl);

        // Download image
        const cachePath = join(global.cachePath, `generated_image_${message.senderID}.png`);
        await downloadImage(imageUrl, cachePath);

        // Check file size and send the image
        const fileStat = statSync(cachePath);
        if (fileStat.size > _48MB) {
            message.reply(getLang('fileTooLarge'));
        } else {
            await message.reply({
                body: `${getLang('imageReady')}${shortUrl}`,
                attachment: global.reader(cachePath)
            });
        }
    } catch (error) {
        console.error(error);
        message.reply(getLang('error'));
    }
}

export default {
    config,
    langData,
    onCall
};
