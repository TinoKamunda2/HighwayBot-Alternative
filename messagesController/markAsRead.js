// markAsRead.js

import axios from "axios";

export async function markAsRead(businessPhoneNumberId, messageId) {
  try {
    await axios({
      method: "POST",
      url: `https://graph.facebook.com/v18.0/${businessPhoneNumberId}/messages`,
      headers: {
        Authorization: `Bearer ${process.env.GRAPH_API_TOKEN}`,
      },
      data: {
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      },
    });
  } catch (error) {
    console.error("Error marking message as read:", error.message);
  }
}