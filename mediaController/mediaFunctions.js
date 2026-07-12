// mediaController/mediaFunctions.js
import connection from "../db.js";
import axios from"axios";
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import {sendMessageFunction} from '../messagesController/sendMessage.js';
import { uploadFile, uploadBufferToWhatsApp, ensureTempDir, getImageBase64, TEMP_DIR } from './mediaUtils.js';
import { sendOneMessageButtonFunction, sendTwoMessageButtonFunction, sendThreeMessageButtonFunction } from '../messagesController/sendButtons.js';
import axiosInstance from '../appUtils/axiosInstance.js';
import { getOrUploadMediaId } from './mediaUtils.js';


// Handle __dirname with ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Send image message to user
async function sendImageMessage(businessPhoneNumberId, user, imageId, caption) {
  try {
    await axiosInstance.post(`https://graph.facebook.com/v18.0/${businessPhoneNumberId}/messages`, {
      messaging_product: "whatsapp",
      to: user,
      type: "image",
      image: { id: imageId, caption },
    }, {
      headers: {
        Authorization: `Bearer ${process.env.GRAPH_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    console.error("Image send error:", err.message);
  }
}

// Send document message to user
async function sendDocumentMessage(businessPhoneNumberId, user, mediaId, caption, filename, isLink = false) {
  const payload = {
    messaging_product: "whatsapp",
    to: user,
    type: "document",
    document: isLink
      ? { link: mediaId, caption, filename }
      : { id: mediaId, caption, filename },
  };

  try {
    await axiosInstance.post(`https://graph.facebook.com/v18.0/${businessPhoneNumberId}/messages`, payload, {
      headers: {
        Authorization: `Bearer ${process.env.GRAPH_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    console.error("Document send error:", err.message);
  }
}

// Send data (message + image if available) to the user
async function sendDataFunction(businessPhoneNumberId, user, messageId, title, text, label, buttonId) {
  try {
    const [rows] = await connection.execute("SELECT * FROM data WHERE title = ? LIMIT 1", [title]);
    if (!rows.length) return console.warn("No data found for:", title);

    const { info, image_no } = rows[0];

    if (image_no) {
      const imageData = await getImageBase64(image_no);
      if (imageData) {
        const buffer = Buffer.from(imageData, 'base64');
        // Get or upload the media and get the mediaId
        const mediaId = await getOrUploadMediaId(image_no, buffer, businessPhoneNumberId);
        if (mediaId) {
          await sendImageMessage(businessPhoneNumberId, user, mediaId, info);
        } else {
          console.warn("Media upload failed for image_no:", image_no);
        }
      }
    } else {
      await sendMessageFunction(businessPhoneNumberId, user, messageId, info);
    }

    if (buttonId) {
      await new Promise(resolve => setTimeout(resolve, 650)); // 500ms delay
      await sendOneMessageButtonFunction(businessPhoneNumberId, user, text, label, buttonId);
    }

  } catch (error) {
    console.error("sendDataFunction Error:", error.message);
  }
}


// Function to send file
async function sendFileFunction(businessPhoneNumberId, user, title, caption, filename, messageId, messageText, buttonText, buttonId) {
  try {
    // 1. Get file record from database
    const [fileRows] = await connection.execute(
      "SELECT * FROM files WHERE title = ? LIMIT 1",
      [title]
    );

    if (fileRows.length === 0) {
      console.error("No file found with the specified title.");
      return;
    }

    const { file_data, file_type, file_link } = fileRows[0];

    // 2. If file_data (base64 from DB) exists
    if (file_data) {
      const filePath = path.join(__dirname, `temp_file_${user}.${file_type}`);
      await fs.writeFile(filePath, Buffer.from(file_data, 'base64'));

      const mediaId = await uploadFile(filePath, businessPhoneNumberId);
      if (mediaId) {
        await sendDocumentMessage(businessPhoneNumberId, user, mediaId, caption, filename);
        await fs.unlink(filePath);
      } else {
        console.log("Failed to upload file.");
      }

    // 3. If file_link (external URL) exists
    } else if (file_link) {
      await sendDocumentMessage(businessPhoneNumberId, user, file_link, caption, filename, true);
    }

    // 4. If a button is to be sent after the file
    if (buttonId) {
      await new Promise(resolve => setTimeout(resolve, 650)); // delay to separate messages
      await sendOneMessageButtonFunction(businessPhoneNumberId, user, messageText, buttonText, buttonId);
    }

  } catch (error) {
    console.error("Error sending file:", error.message);
  }
}


export {
  sendImageMessage,
  sendDocumentMessage,
  sendDataFunction,
  sendFileFunction,
};