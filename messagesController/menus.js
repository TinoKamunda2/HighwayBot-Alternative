// menus.js
import axios from "axios";
import {setMessageState} from '../userStateManager.js';

import {markAsRead} from'./markAsRead.js';
import { sendOneMessageButtonFunction, sendTwoMessageButtonFunction, sendThreeMessageButtonFunction} from './sendButtons.js';

async function sendHomeMenuFunction(businessPhoneNumberId, user, messageId) {
  const text = "🚦 Welcome to *Zim Provisional Driver's License Whatsapp Assistant* - Your *One-Stop* Place to master everything you need to *ACE* your VID provisional Test. \n\n Select 'Subscription' to subscribe or check your subscription status. \nSelect 'Menu' for main menu.";
  const label1 = "Subscription";
  const label2 = "Menu";
  const buttonId1 = "subscription";
  const buttonId2 = "main_menu";
  
  await markAsRead(businessPhoneNumberId, messageId);
  await sendTwoMessageButtonFunction(businessPhoneNumberId, user, text, label1, label2, buttonId1, buttonId2);
}

async function sendMainMenuFunction(businessPhoneNumberId, user, messageId) {
  const text = "🚦 Ready to start mastering the Zimbabwe Learner's License Test? \n\n📚 Choose a menu option to get started: \n1️⃣ *Study Resources* – Learn the Highway Code, road signs, and traffic rules. \n2️⃣ *Specialized and Timed Tests* – Focus on specific topics or challenge yourself with an 8-minute timed test just like the real VID test. \n3️⃣ *Performance Report* – Get insights on your strengths, identify weak areas, and receive expert recommendations to improve. \n\nFor *24/7 live Support* WhatsApp 💬*0777937111* \n\n Type *Home* to go to the Home menu.";
  
  const label1 = "Study Resources";
  const label2 = "Exercises & Tests";
  const label3 = "Track Performance";
  const buttonId1 = "resources";
  const buttonId2 = "exercises";
  const buttonId3 = "track_perfomance";

  await markAsRead(businessPhoneNumberId, messageId);
  await sendThreeMessageButtonFunction(businessPhoneNumberId, user, text, label1, label2,label3, buttonId1, buttonId2, buttonId3);
}

export { sendHomeMenuFunction, sendMainMenuFunction };
