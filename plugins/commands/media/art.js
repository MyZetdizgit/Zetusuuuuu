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
        "generationInProgress": "🖌️ Please wait while your image is being generated...",
        "fileTooLarge": "File is too large, max size is 48MB",
        "imageReady": "Here is your image 🌟\n 4K Link ✨: \n"
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
    let prompt = '';
    let modelIndex = 62;
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
            const modelList = "◉ 𝐌𝐎𝐃𝐄𝐋𝐒 𝐀𝐑𝐓 𝐃𝐈𝐒𝐏𝐎𝐍𝐈𝐁𝐋𝐄𝐒 ◉\n\n0 | 3Guofeng3\n1 | Absolutereality_V16\n..."; // Include the full list
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
