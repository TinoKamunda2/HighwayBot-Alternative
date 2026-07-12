// interactiveLists.js

import axios from "axios";

async function sendOptionsFunction(businessPhoneNumberId, user) {
  try {
    await axios({
      method: "POST",
      url: `https://graph.facebook.com/v18.0/${businessPhoneNumberId}/messages`,
      headers: {
        Authorization: `Bearer ${process.env.GRAPH_API_TOKEN}`,
      },
      data: {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: user,
        type: "interactive",
        interactive: {
          type: "list",
          header: {
            type: "text",
            text: "Choose Payment Option",
          },
          body: {
            text: "Which payment option do you prefer?",
          },
          footer: {
            text: "Drive safe, Drive smart, Pass easy.",
          },
          action: {
            sections: [
              
              {
                title: "ECOCASH - USD",
                rows: [
                  { id: "usd_ecocash_2weeks", title: "2 Weeks", description: "USD$ 2.05 - 2 Weeks Access." },
                  { id: "usd_ecocash_1month", title: "1 Month", description: "USD$ 3.05 - 1 Month Access. (Save $1-00!) " },
                  { id: "usd_starter", title: "Basic Pack", description: "USD$ 3.55 - 1 Month Access + Highway Code + Road Signs (Save $2-50!)." },
                  { id: "usd_exam_booster", title: "Exam Booster", description: "USD$ 4.05 - Basic Pack + Questions Bank + 1 Month Access (Save $5-00!)." },
                  { id: "usd_self_reliance", title: "Self Reliance Package", description: "USD$ 4.55 - Exam Booster + 2 Months Access (Save $8-50!)." },
                ],
              },
              {
                title: "ECOCASH - ZWL",
                rows: [
                  { id: "zwg_ecocash_2weeks", title: "2 Weeks", description: "ZIG 82 - 2 Weeks Access." },
                  { id: "zwg_ecocash_1month", title: "1 Month", description: "ZIG 122 - 1 Month Access. (Save ZIG 40!)" },
                  { id: "zwg_starter", title: "Basic Pack", description: "ZIG 142 - 1 Month Access + Highway Code + Road Signs (Save ZiG 100!)." },
                  { id: "zwg_exam_booster", title: "Exam Booster", description: "ZIG$ 162 - Basic Pack + Questions Bank + 1 Month Access (Save ZIG 200!)." },
                  { id: "zwg_self_reliance", title: "Self Reliance Package", description: "ZIG$ 182 - Exam Booster + 2 Months Access (Save ZIG 340!)." },
                  
                ],
              },
            ],
            button: "Payment Options",
          },
        },
      },
    });
  } catch (error) {
    console.error("Error sending interactive list message:", error.message);
  }
}

// Function to send an interactive Documents list message
async function sendDocumentOptionsFunction(businessPhoneNumberId, user) {
  try {
    await axios({
      method: "POST",
      url: `https://graph.facebook.com/v18.0/${businessPhoneNumberId}/messages`,
      headers: {
        Authorization: `Bearer ${process.env.GRAPH_API_TOKEN}`,
      },
      data: {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: user,
        type: "interactive",
        interactive: {
          type: "list",
          header: {
            type: "text",
            text: "Choose Document",
          },
          body: {
            text: "Which document would you like to buy?",
          },
          footer: {
            text: "Drive safe, Drive smart, Pass easy.",
          },
          action: {
            sections: [
              {
                title: "ECOCASH - ZWL",
                rows: [
                  {
                    id: "zwg_ecocash_highway_code",
                    title: "Highway Code",
                    description: "ZIG 82",
                  },
                  {
                    id: "zwg_ecocash_road_signs",
                    title: "Road Signs",
                    description: "ZIG 82",
                  },
                  {
                    id: "zwg_ecocash_questions_bank",
                    title: "Questions Bank",
                    description: "ZIG 122",
                  },
                ],
              },
              {
                title: "ECOCASH - USD",
                rows: [
                  {
                    id: "usd_ecocash_highway_code",
                    title: "Highway Code",
                    description: "USD$ 2.05",
                  },
                  {
                    id: "usd_ecocash_road_signs",
                    title: "Road Signs",
                    description: "USD$ 2.05",
                  },
                  {
                    id: "usd_ecocash_questions_bank",
                    title: "Questions Bank",
                    description: "USD$ 3.05",
                  },
                ],
              },
            ],
            button: "Payment Options",
          },
        },
      },
    });
  } catch (error) {
    console.error("Error sending interactive list message:", error.message);
  }
}

export { sendOptionsFunction, sendDocumentOptionsFunction };
