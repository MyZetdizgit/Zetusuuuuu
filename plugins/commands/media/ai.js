import axios from 'axios';
import tinyurl from 'tinyurl';

const config = {
  name: "ai",
aliases: ["zet", "ia", "bot","bro"],
  version: "1.0",
  author: "Samir OE",
  hasPermission: 0,
  credits: "Samir OE",
  description: "Interact with AI, format responses, and shorten URLs.",
  usages: "<text>",
  cooldowns: 5,
};

function formatResponse(content) {
  const header = ` ━━☁️ 𝘡𝘦𝘵 𝘉𝘰𝘵 ☁️━━\n`;
  const footer = ` `;
  return `${header}${content.trim()}\n${footer}`;
}

global.api = {
  s: "https://www.samirxpikachu.run" + ".place",
  fallbacks: [
    "http://samirxpikachuio.onrender.com",
    "http://samirxzy.onrender.com"
  ]
};

async function fetchFromAPI(url) {
  try {
    const response = await axios.get(url);
    return response;
  } catch (error) {
    console.error("Primary API failed:", error.message);
    for (const fallback of global.api.fallbacks) {
      try {
        const response = await axios.get(url.replace(global.api.s, fallback));
        return response;
      } catch (error) {
        console.error("Fallback API failed:", error.message);
      }
    }
    throw new Error("All APIs failed.");
  }
}

async function onCall({ api, event, args, message }) {
  const query = args.join(" ") + ", short direct answer";

  try {
    let shortURL = '';
    if (message.type === "message_reply" && ["photo", "sticker"].includes(message.messageReply.attachments?.[0]?.type)) {
      shortURL = await tinyurl.shorten(message.messageReply.attachments[0].url);
    }

    const url = `${global.api.s}/gemini?text=${encodeURIComponent(query)}&system=default&uid=${senderID}${shortURL ? `&url=${encodeURIComponent(shortURL)}` : ''}`;
    const response = await fetchFromAPI(url);

    if (response.data && response.data.candidates && response.data.candidates.length > 0) {
      const responseText = response.data.candidates[0].content.parts[0].text;
      const formattedMessage = formatResponse(responseText);
      message.reply({ body: formattedMessage });
    }
  } catch (error) {
    console.error("Error:", error.message);
    message.reply("Failed to retrieve a response.");
  }
}

export default {
  config,
  onCall
};
