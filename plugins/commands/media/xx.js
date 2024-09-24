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
            const modelGuide = "◉ 𝐌𝐎𝐃𝐄𝐋𝐄𝐒 𝐗𝐗 ◉ \n\n✧ 𝐒𝐃𝐗𝐋 ✧ \n𝟏: 𝐴𝑛𝑖𝑚𝑎𝑔𝑖𝑛𝑒 𝑋𝐿 - 3.1\n𝟐: 𝐴𝑛𝑖𝑚𝑎𝑔𝑖𝑛𝑒 𝑋𝐿 - 𝑉3\n𝟑: 4𝑡ℎ 𝑇𝑎𝑖𝑙 𝐴𝑛𝑖𝑚𝑒 𝐻𝑒𝑛𝑡𝑎𝑖\n𝟒: 𝐶𝐴𝑇 - 𝐶𝑖𝑡𝑟𝑜𝑛 𝐴𝑛𝑖𝑚𝑒 𝑋𝐿\n𝟓: 𝐴𝐴𝑀 𝑋𝐿 𝐴𝑛𝑖𝑚𝑒 𝑀𝑖𝑥 - 𝑣1.0\n𝟔: 𝐷𝑖𝑠𝑛𝑒𝑦 𝑃𝑖𝑥𝑎𝑟 𝑆𝑡𝑦𝑙𝑒 𝑆𝐷𝑋𝐿\n𝟕: 𝐶𝑜𝑚𝑖𝑐𝑠 𝐶ℎ𝑎𝑟𝑎𝑐𝑡𝑒𝑟𝑠 3𝐷\n\n✧ 𝐅𝐋𝐔𝐗 ✧\n𝟖: 𝐹𝐿𝑈𝑋 .1 - 𝑑𝑒𝑣 - 𝑓𝑝8\n𝟗: 𝐹𝑙𝑢𝑥 𝑈𝑛𝑐ℎ𝑎𝑖𝑛𝑒𝑑 𝐴𝑟𝑡𝑓𝑢𝑙 𝑁𝑆𝐹𝑊\n𝟏𝟎: 𝐹𝐿𝑈𝑋 - 𝐷𝑟𝑒𝑎𝑚 𝐷𝑖𝑓𝑓𝑢𝑠𝑖𝑜𝑛 \n\n✧ 𝐒𝐃-𝟏.𝟓 ✧\n𝟏𝟏: 𝑆𝑢𝑑𝑎𝑐ℎ𝑖 - 𝑉1\n𝟏𝟐: 𝑂𝑥𝑎𝑙𝑖𝑠 𝐴𝑛𝑖𝑚𝑒 \n𝟏𝟑: 𝑃𝑒𝑟𝑓𝑒𝑐𝑡 𝑊𝑜𝑟𝑙𝑑 𝑉6\n𝟏𝟒: 𝐶ℎ𝑖𝑙𝑙𝑜𝑢𝑡 𝑀𝑖𝑥 - 𝑁𝑖\n𝟏𝟓: 𝐴𝑠𝑡𝑟 𝐴𝑛𝑖𝑚𝑒 - 6.0\n𝟏𝟔: 𝑀𝑒𝑖𝑛𝑎 𝐻𝑒𝑛𝑡𝑎𝑖 - v3\n𝟏𝟕: 3𝐷 𝐶𝑎𝑟𝑡𝑜𝑜𝑛 𝑉𝑖𝑠𝑖𝑜𝑛 - 𝑉1\n\n ****\n𝟏𝟖: 7𝑡ℎ 𝐴𝑛𝑖𝑚𝑒 𝑋𝐿 - 𝐵\n𝟏𝟗: 𝑂𝑝𝑒𝑛𝐷𝑎𝑙𝑙𝑒 - 3\n𝟐𝟎: 𝐾𝑜ℎ𝑎𝑘𝑢 𝑋𝐿 - 𝑃𝑠𝑖𝑙𝑜𝑛\n𝟐𝟏: 7𝑡ℎ 𝐴𝑛𝑖𝑚𝑒 𝑋𝐿 - 𝐴\n𝟐𝟐: 𝐶ℎ𝑖𝑚𝑒𝑟𝑎 - 2\n𝟑𝟎: 𝐴𝑛𝑖𝑚𝑎𝑔𝑖𝑛𝑒𝑋𝑙31 - 𝑅𝑒𝑚𝑖𝑥";
            return message.reply(modelGuide);
        }

        if (prompt.toLowerCase().trim() === "lora") {
            const loraGuide = "◉ 𝐋𝐎𝐑𝐀𝐒 𝐗𝐗 ◉\n\n✧ 𝐒𝐃𝐗𝐋 (𝟏-𝟑𝟎)\n1: Niji Anime Style XL\n2: Niji6 - v6\n3: StylesPony XL - RAR Animagine\n4: Kohaku Outline XL\n5: Pony Retro Anime V2\n6: Anime Enhancer XL v5\n7: Detailed Anime Style XL V01\n8: Niji Background XL v1 - Normal\n9: Midjourney Anime Style XL\n10: Extremely Realistic Style XL\n\n✧ 𝐃𝐞𝐭𝐚𝐢𝐥𝐬 𝐗𝐋 (𝟏𝟏-𝟐𝟒)\n11: Extra Detailer XL\n12: Detail Tweaker XL 3.0\n13: Add More Details XL\n14: Add More Detail XL \n15: Detailer XL Ultra\n16: Enhance Facial Details SDXL\n17: Colorful Enhancer XL\n18: Photo Enhancer XL\n19: Shadow Correction XL v1.1\n20: Body Weight Slider XL\n21: Skin Tone Slider XL V1\n22: Perfect Hands XL\n23: EpiC XL Perfect Fingers\n\n✧ 𝐍𝐬𝐟𝐰 𝐗𝐋 (𝟐𝟒-𝟑𝟎)\n24: Plunder Hentai Style XL\n25: Naked Girls V1\n26: Cunnilingus XL 0.5\n27: Deep Penetration Concept XL\n28: Labiaplasty Innie Pussy\n29: Motion Sex XL\n30: Breasts Slider XL\n\n✧ 𝐅𝐋𝐔𝐗 (𝟑𝟏-𝟑𝟗)\n31: Flux Anime Style TEST.VERSION\n32: Flux Comics Style T2\n33: Flux Fantasy Detailers V1.0\n34: Midjourney Whisper Flux LoRA\n35: XLabs Flux Realism LoRA v1.0\n36: Flux Realism Woman V2.0\n37: Flux Booba\n38: Flux Perfect Full Round Breasts\n39: Flux Detailer TA v0.1\n\n✧ 𝐒𝐃-𝟏.𝟓 (𝟒𝟎-𝟓𝟖)\n40: Sexy Pose Style V5 Slider\n41: Real Hands XL v1.0\n42: Adds Elements Details V1.1\n43: Better Hands - HANDS\n44: Attractive Eyes SDXL Version\n45: Breasts with Pink Nipples 2.0\n46: Add More Realism V1.0\n47: Detail Enhancer Tweaker LoRA \n48: Add Details Eyes Face Skin V1\n49: Missionary POV V1.0\n50: Oiled Skin SD 1.5 Pony PDXLV1\n51: Hands Repair LoRA V5 \n52: Huge Butt Huge Breasts V1\n53: Nude Woman V2\n54: Oxalis Hentai LoRA V1 \n55: Tentacles SD 1.5 V9.0\n56: Extremely Realistic Style\n57: Add Ultra Details V1\n58: Shinyoiledskin 2.0\n\nEVEN\n59: Xl More Art Real Enhancer\n60: Midjourney Anime Style\n61: Niji Background Xl\62: Niji5 - v6";
            return message.reply(loraGuide);
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
