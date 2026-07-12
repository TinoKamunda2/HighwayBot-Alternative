//messagesController/sendButtons.js

import axios from "axios";

// Utility to validate and trim labels and IDs
function sanitizeButton(label, id) {
  return {
    title: label.toString().trim().slice(0, 20), // Max 20 chars
    id: id.toString().trim().slice(0, 256), // Max 256 chars
  };
}

async function sendImageButtonFunction(businessPhoneNumberId, user, mediaId, text, buttons) {
  try {
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: user,
      type: "interactive",
      interactive: {
        type: "button",
        header: {
          type: "image",
          image: {
            id: mediaId, // <-- Use media ID here instead of link
          },
        },
        body: { text },
        action: {
          buttons: buttons.map(({ title, id }) => ({
            type: "reply",
            reply: { id, title },
          })),
        },
      },
    };

    await axios({
      method: "POST",
      url: `https://graph.facebook.com/v18.0/${businessPhoneNumberId}/messages`,
      headers: {
        Authorization: `Bearer ${process.env.GRAPH_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      data: payload,
    });

  } catch (error) {
    if (error.response) {
      console.error("WhatsApp API Error:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("Error sending image button message:", error.message);
    }
  }
}


async function sendButtonMessage(businessPhoneNumberId, user, text, buttons) {
  try {
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: user,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text },
        action: {
          buttons: buttons.map(({ title, id }) => ({
            type: "reply",
            reply: { id, title },
          })),
        },
      },
    };

    const response = await axios({
      method: "POST",
      url: `https://graph.facebook.com/v18.0/${businessPhoneNumberId}/messages`,
      headers: {
        Authorization: `Bearer ${process.env.GRAPH_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      data: payload,
    });

    //console.log(`Sent ${buttons.length}-button message to ${user}:`, response.data);
  } catch (error) {
    if (error.response) {
      console.error("WhatsApp API Error:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("Error sending button message:", error.message);
    }
  }
}

// One-button wrapper
async function sendOneMessageButtonFunction(businessPhoneNumberId, user, text, label, buttonId) {
  const button = sanitizeButton(label, buttonId);
  await sendButtonMessage(businessPhoneNumberId, user, text, [button]);
}

// Two-button wrapper
async function sendTwoMessageButtonFunction(businessPhoneNumberId, user, text, label1, label2, buttonId1, buttonId2) {
  const buttons = [
    sanitizeButton(label1, buttonId1),
    sanitizeButton(label2, buttonId2),
  ];
  await sendButtonMessage(businessPhoneNumberId, user, text, buttons);
}

// Three-button wrapper
async function sendThreeMessageButtonFunction(businessPhoneNumberId, user, text, label1, label2, label3, buttonId1, buttonId2, buttonId3) {
  const buttons = [
    sanitizeButton(label1, buttonId1),
    sanitizeButton(label2, buttonId2),
    sanitizeButton(label3, buttonId3),
  ];
  await sendButtonMessage(businessPhoneNumberId, user, text, buttons);
}

export {
  sendOneMessageButtonFunction,
  sendTwoMessageButtonFunction,
  sendThreeMessageButtonFunction,
  sendImageButtonFunction
};
