//mediaContoller/mediaUtils.js
import fs from 'fs';
import connection from "../db.js";
import path from 'path';
import FormData from 'form-data';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const TEMP_DIR = path.join(__dirname, 'temp');

export async function ensureTempDir() {
  try {
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR);
    }
  } catch (error) {
    console.error("Error ensuring temp directory:", error.message);
  }
}

// Upload a media file to WhatsApp
export async function uploadBufferToWhatsApp(buffer, businessPhoneNumberId, filename) {
  const formData = new FormData();
  const stream = Readable.from(buffer);
  formData.append("file", stream, { filename });
  formData.append("messaging_product", "whatsapp");

  try {
    const { data } = await axios.post(
      `https://graph.facebook.com/v18.0/${businessPhoneNumberId}/media`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${process.env.GRAPH_API_TOKEN}`,
          ...formData.getHeaders(),
        },
      }
    );
    return data.id;
  } catch (error) {
    console.error("Media upload failed:", error.message);
    return null;
  }
}

// Check if the media ID is valid
async function checkMediaIdValidity(mediaId, businessPhoneNumberId) {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/v18.0/${mediaId}`,
      {
        params: {
          messaging_product: 'whatsapp',
          access_token: process.env.GRAPH_API_TOKEN,
        },
      }
    );
    // If the response is successful and contains media information, the media ID is valid
    if (response.data.id) {
      console.log(`Media ID ${mediaId} is still valid.`);
      return true;
    }
    console.log(`Media ID ${mediaId} is invalid or expired.`);
    return false;
  } catch (error) {
    console.error("Error checking media ID validity:", error.message);
    return false;
  }
}

// Get image as base64 from the database
export async function getImageBase64(image_no) {
  try {
    const [rows] = await connection.execute(
      "SELECT image_data FROM diagrams WHERE image_no = ? LIMIT 1",
      [image_no]
    );
    return rows.length ? rows[0].image_data.toString('base64') : null;
  } catch (error) {
    console.error("Image fetch error:", error.message);
    return null;
  }
}

// Get or Update media ID to database
export async function getOrUploadMediaId(image_no, buffer, businessPhoneNumberId) {
  
  // Query to check if the mediaId already exists for the image_no
  const [rows] = await connection.execute("SELECT media_id FROM diagrams WHERE image_no = ?", [image_no]);
  
  if (rows.length && rows[0].media_id) {
    const mediaId = rows[0].media_id;
    // Check if the existing media ID is valid
    const isValid = await checkMediaIdValidity(mediaId, businessPhoneNumberId);
    if (isValid) {
      console.log(`Media ID for image_no ${image_no} is valid.`);
      return mediaId;
    } else {
      console.log(`Media ID for image_no ${image_no} is invalid, re-uploading...`);
    }
  }

  // If media_id doesn't exist or is invalid, upload the image and store the new mediaId in the database
  const mediaId = await uploadBufferToWhatsApp(buffer, businessPhoneNumberId, image_no + ".jpg");  
  
  if (mediaId) {
    // Store the media_id in the database
    await connection.execute("UPDATE diagrams SET media_id = ? WHERE image_no = ?", [mediaId, image_no]);
    console.log(`Media ID for image_no ${image_no} updated: ${mediaId}`);
  }
  return mediaId;
}

// Function to upload file to WhatsApp and get media ID
export async function uploadFile(filePath, businessPhoneNumberId) {
  try {
    const formData = new FormData();
    formData.append("file", fs.createReadStream(filePath)); // Attach the file from the given filePath
    formData.append("messaging_product", "whatsapp"); // Specify WhatsApp as the messaging product

    const response = await axios({
      method: "POST",
      url: `https://graph.facebook.com/v18.0/${businessPhoneNumberId}/media`, // API endpoint for uploading media
      headers: {
        Authorization: `Bearer ${process.env.GRAPH_API_TOKEN}`, // Set authorization token
        ...formData.getHeaders(), // Include necessary form headers
      },
      data: formData, // Send the form data with the request
    });

    const mediaId = response.data.id; // Extract media ID from the response
    console.log("File uploaded successfully. Media ID:", mediaId);
    return mediaId; // Return the media ID for further use
  } catch (error) {
    console.error("Error uploading file:", error.message);
    return null; // Return null in case of an error
  }
}
