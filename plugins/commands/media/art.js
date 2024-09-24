import { createWriteStream, statSync } from 'fs';
import { join } from 'path';
import axios from 'axios';
import tinyurl from 'tinyurl';

const _48MB = 48 * 1024 * 1024;

const config = {
    name: "art",
    version: "2.0",
    description: "Generate an image based on a prompt and an initial image.",
    usage: "{pn} <imageURL> <prompt> [-m <modelIndex>]",
    credits: "Zetssu",
    cooldown: 5
};

const langData = {
    "en_US": {
        "error": "An error occurred. Please try again later.",
        "generationInProgress": "🖌️ Pls wait...",
        "fileTooLarge": "File is too large, max size is 48MB",
        "imageReady": "Here is your image 🌟"
    }
};

async function generateImage({ imageUrl, prompt, modelIndex = 62, width = 1024, height = 1024 }) {
    const apiUrl = `https://zetart-igub.onrender.com/generate?imageUrl=${encodeURIComponent(imageUrl)}&prompt=${encodeURIComponent(prompt)}&modelIndex=${modelIndex}&width=${width}&height=${height}`;
    
    // Request the image directly from the API (binary format)
    const response = await axios.get(apiUrl, { responseType: 'stream' });

    if (!response.data) {
        throw new Error("No image returned from API");
    }
    
    return response.data; // Return the image stream directly
}

async function downloadImage(imageStream, cachePath) {
    const imageWriteStream = createWriteStream(cachePath);
    
    // Pipe the image stream to the file
    imageStream.pipe(imageWriteStream);

    return new Promise((resolve, reject) => {
        imageWriteStream.on('finish', () => resolve(true));
        imageWriteStream.on('error', (err) => reject(err));
    });
}

async function onCall({ message, args, getLang }) {
    let imageUrl = '';
    let prompt = 'same details';
    let modelIndex = 2;
    let width = 1024;
    let height = 1024;

    try {
        // Handle arguments
        if (args.length > 0) {
            prompt = args.join(" ");
            const modelArgIndex = args.indexOf("--model");

            if (modelArgIndex !== -1) {
                modelIndex = parseInt(args[modelArgIndex + 1], 10);
            }
        }

        if (prompt.toLowerCase() === "guide") {
            const guideMessage = "◉ 𝐆𝐔𝐈𝐃𝐄 𝐀𝐑𝐓 :\n\n(Reply to an image) Art prompt --model (0-64)\n\n◉ 𝐏𝐨𝐮𝐫 𝐯𝐨𝐢𝐫 𝐥𝐞𝐬 𝐦𝐨𝐝𝐞𝐥𝐬 𝐝𝐢𝐬𝐩𝐨𝐧𝐢𝐛𝐥𝐞𝐬: Art model";
            return message.reply(guideMessage);
        }

        if (prompt.toLowerCase() === "model") {
            const modelList = "◉ 𝐌𝐎𝐃𝐄𝐋𝐒 𝐀𝐑𝐓 𝐃𝐈𝐒𝐏𝐎𝐍𝐈𝐁𝐋𝐄𝐒 ◉\n\n0 | 3Guofeng3\n1 | Absolutereality_V16\n2 | Absolutereality_v181\n3 | AmIReal_V41\n4 | Analog-diffusion-1.0\n5 | Anythingv3_0-pruned\n6 | Anything-v4.5-pruned\n7 | AnythingV5_PrtRE\n8 | AOM3A3_orangemixs\n9 | Blazing_drive_v10g\n10 | Breakdomain_I2428\n11 | Breakdomain_M2150\n12 | CetusMix_Version35\n13 | ChildrensStories_v13D\n14 | ChildrensStories_v1SemiReal\n15 | ChildrensStories_v1ToonAnime\n16 | Counterfeit_v30\n17 | Cuteyukimixadorable\n18 | Cyberrealistic_v33\n19 | Dalcefo_v4\n20 | Deliberate_v2\n21 | Deliberate_v3\n22 | Dreamlike-anime-1.0\n23 | Dreamlike-diffusion-1.0\n24 | Dreamlike-photoreal-2.0\n25 | Dreamshaper_6BakedVae\n26 | Dreamshaper_7\n27 | Dreamshaper_8\n28 | Edgeofrealism_eorV20\n29 | Eimisanimediffusion_v1\n30 | Elldreths-vivid-mix\n31 | Epicphotogasm_xplusplus\n32 | Epicrealism_naturalsinrc1vae\n33 | Epicrealism_pureevolutionv3\n34 | Icantbelieveit\n35 | Indigofurrymix_v75hybrid\n36 | Juggernaut_aftermath\n37 | Lofi_v4\n38 | Lyriel_v16\n39 | Majicmixrealistic_v4\n40 | Mechamix_v10\n41 | Meinamix_meinav9\n42 | Meinamix_meinav11\n43 | Neverendingdream_v122\n44 | Openjourney_v4\n45 | Pastelmixstylize\n46 | Portraitplus_v1.0\n47 | Protogenx34\n48 | Realistic_vision_v1.4\n49 | Realistic_vision_v2.0\n50 | Realistic_vision_v4.0\n51 | Realistic_vision_v5.0\n52 | Redshift_diffusion-v10\n53 | Revanimated_v122\n54 | Rundiffusionfx25d_v10\n55 | Rundiffusionfx_v10\n56 | Sdv1_4\n57 | V1-5-pruned-emaonly\n58 | V1-5-inpainting\n59 | Shoninsbeautiful_v10\n60 | Theallys-mix-ii-churned\n61 | Timeless-1.0\n62 | Toonyou_beta6\n63 | Realistic_Vision_V5.1\n64 | Aniverse_v30"; // Include the full list
            return message.reply(modelList);
        }

        if (message.type === "message_reply" && message.messageReply.attachments && message.messageReply.attachments[0]) {
            if (["photo", "sticker"].includes(message.messageReply.attachments[0].type)) {
                imageUrl = message.messageReply.attachments[0].url;
                width = message.messageReply.attachments[0].width;
                height = message.messageReply.attachments[0].height;

                const aspectRatio = width / height;
                if (width > 1024 || height > 1024) {
                    if (width > height) {
                        width = 1024;
                        height = Math.floor(1024 / aspectRatio);
                    } else {
                        height = 1024;
                        width = Math.floor(1024 * aspectRatio);
                    }
                }
            } else {
                return message.reply("❌ | You must reply to an image.\n\nType [Art guide] for more details.");
            }
        } else if (args[0]?.match(/(https?:\/\/.*\.(?:png|jpg|jpeg))/g)) {
            imageUrl = args[0];
        } else {
            return message.reply("❌ | You must reply to an image.\n\nType [Art guide] for more details.");
        }

        // Inform the user about image generation
        message.reply(getLang('generationInProgress'));

        // Generate image
        const imageStream = await generateImage({ imageUrl, prompt, modelIndex, width, height });

        // Define cache path
        const cachePath = join(global.cachePath, `generated_image_${message.senderID}.png`);
        
        // Download image to cache
        await downloadImage(imageStream, cachePath);

        // Check file size and send the image
        const fileStat = statSync(cachePath);
        if (fileStat.size > _48MB) {
            message.reply(getLang('fileTooLarge'));
        } else {
            await message.reply({
                body: `${getLang('imageReady')}`,
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
