// messagesController/sendMessage.js

import axios from "axios";

async function sendMessageFunction(businessPhoneNumberId, user, messageId, messageData) {
  try {
    await axios({
      method: "POST",
      url: `https://graph.facebook.com/v18.0/${businessPhoneNumberId}/messages`,
      headers: {
        Authorization: `Bearer ${process.env.GRAPH_API_TOKEN}`,
      },
      data: {
        messaging_product: "whatsapp",
        to: user,
        text: { body: messageData },
        context: {
          message_id: messageId,
        },
      },
    });
  } catch (error) {
    console.error("Error sending other messages:", error.message);
  }
}

async function sendIrideCode(to, message) {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${process.env.MY_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GRAPH_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ iRide code sent successfully:", response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error("❌ Failed to send iRide code:", error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
}


export {sendMessageFunction, sendIrideCode};
