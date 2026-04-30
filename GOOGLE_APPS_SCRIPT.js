/**
 * GOOGLE APPS SCRIPT CODE
 * 
 * Instructions:
 * 1. Open your Google Sheet.
 * 2. Go to Extensions > Apps Script.
 * 3. Delete any code there and paste this entire file.
 * 4. Fill in the SPREADSHEET_ID and TELEGRAM_TOKEN below.
 * 5. Deploy as "Web App", set access to "Anyone".
 * 6. Run the 'setWebhook' function once after deploying.
 */

const SPREADSHEET_ID = "1xf0u70mfvq6So3KQMu_CtdMLuehL0YvpqVelTgx5Ylg"; // <-- Put your Sheet ID here
const TELEGRAM_TOKEN = "8726131273:AAH5K2bzDOvG1Jg6XZCCr_doZH1yQ3o4U04"; // <-- From @BotFather
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbx0mSpQT93qAojRBY_2gIVAf1JEQFRdnyM2bdysOQ9GhZc2ewk28i9k4WSlGO4f_hMNxw/exec"; // <-- Get this after deploying
const ADMIN_CHAT_ID = "2140020900"; // <-- Get yours from @userinfobot to secure the bot

/**
 * Part 1: The API for the Website (doGet)
 */
function doGet() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
    const data = sheet.getDataRange().getValues();
    const headers = data.shift(); // Remove: Episode, Title, ImageURLs, Description
    
    const episodes = data.map(row => ({
      episode: parseInt(row[0]),
      title: row[1],
      imageUrls: row[2].toString().split(',').map(url => url.trim()).filter(url => url.length > 0),
      description: row[3] || "No description available."
    }));
    
    // Sort newest first for the website
    episodes.sort((a, b) => b.episode - a.episode);
    
    return ContentService.createTextOutput(JSON.stringify(episodes))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Part 2: Telegram Bot Integration (doPost)
 */
function doPost(e) {
  try {
    const contents = JSON.parse(e.postData.contents);
    if (!contents.message) return;
    
    const chatId = contents.message.chat.id;
    const text = contents.message.text || "";

    // Welcome message is public
    if (text === '/start') {
      sendTelegramMessage(chatId, "Welcome to the Neo Toon Admin Bot!\n\nCommands:\n/upload name: Title, episode: 1, images: url1, url2\n/delete Title\n/list");
      return;
    }

    // SECURITY: Check if user is the admin
    if (String(chatId) !== String(ADMIN_CHAT_ID)) {
      sendTelegramMessage(chatId, "🚫 Access Denied. Only the owner can manage this library.");
      return;
    }
    
    // Command: /upload name: Title, episode: 1, images: url1, url2...
    if (text.startsWith('/upload')) {
      const parts = text.replace('/upload', '').split(',');
      let name = "", ep = "", images = "", desc = "";
      
      parts.forEach(p => {
        if (p.includes('name:')) name = p.split('name:')[1].trim();
        if (p.includes('episode:')) ep = p.split('episode:')[1].trim();
        if (p.includes('images:')) images = p.split('images:')[1].trim();
        if (p.includes('desc:')) desc = p.split('desc:')[1].trim();
      });
      
      if (!name || !ep || !images) {
        sendTelegramMessage(chatId, "⚠️ Usage: /upload name: Title, episode: 1, images: url1, url2, desc: optional");
        return;
      }
      
      const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
      sheet.appendRow([ep, name, images, desc]);
      sendTelegramMessage(chatId, "✅ Successfully uploaded Episode " + ep + ": " + name);
    }
    
    // Command: /delete [title]
    else if (text.startsWith('/delete')) {
      const target = text.replace('/delete', '').trim();
      const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
      const data = sheet.getDataRange().getValues();
      let deleted = false;
      
      for (let i = data.length - 1; i >= 1; i--) {
        if (data[i][1].toString().toLowerCase() === target.toLowerCase()) {
          sheet.deleteRow(i + 1);
          deleted = true;
        }
      }
      sendTelegramMessage(chatId, deleted ? "🗑️ Deleted: " + target : "❌ Episode '" + target + "' not found.");
    }
    
    // Command: /list
    else if (text === '/list') {
      const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
      const data = sheet.getDataRange().getValues();
      data.shift(); // Remove headers
      const list = data.map(r => "• EP " + r[0] + ": " + r[1]).join("\n");
      sendTelegramMessage(chatId, list ? "📚 Library:\n" + list : "📭 Library is empty.");
    }
    
    // Start message - (No longer needed here as handled above)
    
  } catch (error) {
    // Fail gracefully
  }
}

function sendTelegramMessage(chatId, text) {
  const url = "https://api.telegram.org/bot" + TELEGRAM_TOKEN + "/sendMessage";
  const payload = {
    method: "post",
    payload: {
      chat_id: String(chatId),
      text: text
    }
  };
  UrlFetchApp.fetch(url, payload);
}

/**
 * Run this function ONCE after deploying to link your bot
 */
function setWebhook() {
  const url = "https://api.telegram.org/bot" + TELEGRAM_TOKEN + "/setWebhook?url=" + WEB_APP_URL;
  const response = UrlFetchApp.fetch(url);
  Logger.log(response.getContentText());
}
