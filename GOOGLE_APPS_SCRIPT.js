/**
 * TOON BOT v3.0 - STABLE & SMART
 * 
 * Instructions:
 * 1. Replace ALL code in your Apps Script editor.
 * 2. Update SPREADSHEET_ID, TELEGRAM_TOKEN, and WEB_APP_URL.
 * 3. Deploy as "Web App", set access to "Anyone".
 * 4. Run 'setWebhook' after deploying.
 */

const SPREADSHEET_ID = "1xf0u70mfvq6So3KQMu_CtdMLuehL0YvpqVelTgx5Ylg"; 
const TELEGRAM_TOKEN = "8726131273:AAH5K2bzDOvG1Jg6XZCCr_doZH1yQ3o4U04"; 
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbx0mSpQT93qAojRBY_2gIVAf1JEQFRdnyM2bdysOQ9GhZc2ewk28i9k4WSlGO4f_hMNxw/exec"; 
const ADMIN_CHAT_ID = "2140020900"; 

function doGet() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Episodes");
    const data = sheet.getDataRange().getValues();
    data.shift(); 
    const episodes = data.map(row => ({
      episode: parseInt(row[0]),
      title: row[1],
      imageUrls: row[2].toString().split(',').map(url => url.trim()).filter(url => url.length > 0),
      description: row[3] || ""
    })).sort((a,b) => b.episode - a.episode);
    return ContentService.createTextOutput(JSON.stringify(episodes)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const contents = JSON.parse(e.postData.contents);
    if (!contents.message) return;
    
    const chatId = String(contents.message.chat.id);
    const text = contents.message.text || "";
    const photos = contents.message.photo;
    
    if (chatId !== ADMIN_CHAT_ID) {
      sendTelegramMessage(chatId, "🚫 Access Denied.");
      return;
    }

    if (text === '/cancel') {
      saveState(chatId, null);
      sendTelegramMessage(chatId, "Got it baby! Action cancelled. 😊");
      return;
    }

    const state = getState(chatId);

    // --- UPLOAD / EDIT FLOW ---
    if (text === '/upload' || text === '/edit') {
      const titles = getExistingTitles();
      let msg = text === '/upload' ? "New Upload! " : "Editing! ";
      msg += titles.length > 0 ? "Existing names or create new?\n\n• " + titles.join("\n• ") : "Create your first webtoon name:";
      saveState(chatId, { cmd: text.replace('/',''), step: 'name' });
      sendTelegramMessage(chatId, msg);
      return;
    }

    if (state.cmd === 'upload' || state.cmd === 'edit') {
      if (state.step === 'name') {
        const count = getEpisodeCount(text);
        saveState(chatId, { ...state, step: 'ep', title: text });
        sendTelegramMessage(chatId, `You have ${count} episodes for "${text}"! Episode number is?`);
        return;
      }
      if (state.step === 'ep') {
        saveState(chatId, { ...state, step: 'photo', ep: text });
        sendTelegramMessage(chatId, "Upload photo here (Send the image file) 😊❤");
        return;
      }
      if (state.step === 'photo' && photos) {
        const fileId = photos[photos.length - 1].file_id;
        const fileUrl = getTelegramUrl(fileId);
        addOrUpdateEpisode(state.title, state.ep, fileUrl, state.cmd === 'edit');
        saveState(chatId, null);
        sendTelegramMessage(chatId, "Upload Finished!!! Thank you Baby ❤️😊❤");
        return;
      }
    }

    // --- DELETE FLOW ---
    if (text === '/delete') {
      const titles = getExistingTitles();
      if (titles.length === 0) return sendTelegramMessage(chatId, "Library is empty!");
      saveState(chatId, { cmd: 'delete', step: 'name' });
      sendTelegramMessage(chatId, "Please type a name to delete:\n\n• " + titles.join("\n• "));
      return;
    }

    if (state.cmd === 'delete') {
      if (state.step === 'name') {
        const eps = getEpisodesForTitle(text);
        saveState(chatId, { ...state, step: 'ep', title: text });
        sendTelegramMessage(chatId, `Existing episodes for "${text}": ${eps.join(", ")}.\nWhich episode number?`);
        return;
      }
      if (state.step === 'ep') {
        deleteEpisode(state.title, text);
        saveState(chatId, null);
        sendTelegramMessage(chatId, "Finished baby!!! 🗑️❤");
        return;
      }
    }

    if (text === '/list') {
      const titles = getExistingTitles();
      sendTelegramMessage(chatId, "📚 LIBRARY:\n" + (titles.join("\n") || "Empty"));
    }

    if (text === '/start') {
      sendTelegramMessage(chatId, "Hi Baby! ❤️ Commands:\n/upload - New content\n/edit - Update content\n/delete - Remove content\n/list - View Library");
    }

  } catch (err) {
    sendTelegramMessage(ADMIN_CHAT_ID, "⚠️ Error: " + err.message);
  }
}

// HELPERS
function getTelegramUrl(fileId) {
  const res = JSON.parse(UrlFetchApp.fetch("https://api.telegram.org/bot" + TELEGRAM_TOKEN + "/getFile?file_id=" + fileId).getContentText());
  return "https://api.telegram.org/file/bot" + TELEGRAM_TOKEN + "/" + res.result.file_path;
}

function saveState(id, data) {
  PropertiesService.getScriptProperties().setProperty('state_' + id, data ? JSON.stringify(data) : "");
}

function getState(id) {
  const val = PropertiesService.getScriptProperties().getProperty('state_' + id);
  return val ? JSON.parse(val) : {};
}

function getExistingTitles() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Episodes");
  const titles = sheet.getRange("B2:B").getValues().flat().filter(t => t);
  return [...new Set(titles)];
}

function getEpisodeCount(title) {
  return getEpisodesForTitle(title).length;
}

function getEpisodesForTitle(title) {
  const data = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Episodes").getDataRange().getValues();
  return data.filter(r => r[1] === title).map(r => r[0]);
}

function addOrUpdateEpisode(title, ep, url, replace) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Episodes");
  const data = sheet.getDataRange().getValues();
  let found = false;
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === title && String(data[i][0]) === String(ep)) {
      const newVal = replace ? url : (data[i][2] ? data[i][2] + "," + url : url);
      sheet.getRange(i + 1, 3).setValue(newVal);
      found = true; break;
    }
  }
  if (!found) sheet.appendRow([ep, title, url, ""]);
}

function deleteEpisode(title, ep) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Episodes");
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][1] === title && String(data[i][0]) === String(ep)) sheet.deleteRow(i + 1);
  }
}

function sendTelegramMessage(chatId, text) {
  UrlFetchApp.fetch("https://api.telegram.org/bot" + TELEGRAM_TOKEN + "/sendMessage", { method: "post", payload: { chat_id: String(chatId), text: text } });
}

function setWebhook() {
  const res = UrlFetchApp.fetch("https://api.telegram.org/bot" + TELEGRAM_TOKEN + "/setWebhook?url=" + WEB_APP_URL);
  Logger.log(res.getContentText());
}