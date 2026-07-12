import connection from "../db.js";
import {sendOneMessageButtonFunction, sendTwoMessageButtonFunction, sendThreeMessageButtonFunction} from '../messagesController/sendButtons.js';
import {markAsRead} from '../messagesController/markAsRead.js';
import {sendMessageFunction} from '../messagesController/sendMessage.js';
import {
  initializeUserState,
  userStatesMap,
  setMessageState,
  setTestCompletionState,
  setCategory,
  setAnswersCount,
  setQuestionsLimit,
  setCorrectAnswer,
  setQuestionType,
  setExplanation,
  setQuestionNumber,
  setIncrementedQuestionNumber,
  incrementQuestionNumber,
  setTimeLimit,
  setTimeTaken,
  setTimeTakenSeconds,
  setExpiration,
  setPaymentOption,
  setPaymentNumber,
  setPaymentAmount,
  setPaymentCurrency,
  setSubscriptionPackage,
  setAskedQuestions,
  resetUserData
} from '../userStateManager.js';


// Getters (add these in userStateManager.js if not already present)
const getUserState = (user) => {
  initializeUserState(user);
  return userStatesMap.get(user);
};

const getExpiration = (user) => getUserState(user).expiration;
const getSubscriptionPackage = (user) => getUserState(user).subscriptionPackage;
const getPaymentNumber = (user) => getUserState(user).paymentNumber;
const getPaymentAmount = (user) => getUserState(user).paymentAmount;
const getPaymentCurrency = (user) => getUserState(user).paymentCurrency;

// Check subscription
export async function checkSubscriptionAndHandleMessage(businessPhoneNumberId, user, messageId) {
  const subscriptionStatus = await checkUserSubscription(user);

  if (subscriptionStatus === 'not in database') {
    const text = `🚦 Welcome to the Zim Provisional Driver’s License Assistant! 

*Want to become a legal driver in Zimbabwe?* It all starts with passing the *VID Provisional Test* – and we’re here to make sure you *ACE* it on your first try! ✅

This is your *One-Stop* Place to master everything you need:
📖 Full Highway Code & Road Rules
🚦 Road Signs, Traffic Signals & Intersection Simulations Explained
📝 Real Practice Questions & *8 Minute Timed Test Simulations* - Just Like the Real VID Test!
📊 Performance Analysis – get personalized feedback, identify weak areas, and receive expert recommendations to improve faster!

*No more failing!* We’ve got the secrets to help you pass fast and with confidence. Ready to begin your journey to becoming a fully licensed driver? Let’s go! 🚀🔥`; 

    setSubscriptionPackage(user, "Trial");
    await addNewUser(user);
    await markAsRead(businessPhoneNumberId, messageId);
    await sendMessageFunction(businessPhoneNumberId, user, messageId, text);
    return true;

  } else if (subscriptionStatus === true) {
    // Subscription is valid
    return true;

  } else {
    // Subscription expired
    const text = "🚫 Your subscription has expired. To continue using the assistant, please *renew your subscription*.\n\nSelect 'Subscription' then 'Subscribe' to view available packages and subscribe or 'Menu' for the main menu.";
    const label1 = "Subscription";
    const label2 = "Menu";
    const buttonId1 = "subscription";
    const buttonId2 = "main_menu";

    await markAsRead(businessPhoneNumberId, messageId);
    await sendTwoMessageButtonFunction(
      businessPhoneNumberId,
      user,
      text,
      label1,
      label2,
      buttonId1,
      buttonId2
    );
    return false;
  }     
}

// Check subscription from DB or state
export async function checkUserSubscription(user) {
  const now = new Date();

  const [rows] = await connection.execute(
    'SELECT expiration_date FROM users WHERE phone = ?',
    [user]
  );

  // User not found in DB
  if (rows.length === 0) {
    return 'not in database';
  }

  const expirationDate = new Date(rows[0].expiration_date);

  // Save to in-memory cache (optional optimization)
  setExpiration(user, expirationDate);

  // Check if subscription is still valid
  return expirationDate > now;
}


// Check subscription details and send message
export async function checkSubscriptionFunction(businessPhoneNumberId, user, messageId) {
  try {
    const [rows] = await connection.execute(
      'SELECT package, expiration_date, payment_date, date FROM users WHERE phone = ?',
      [user]
    );

    if (rows.length > 0) {
      const { package: userPackage, expiration_date: expirationDate, payment_date: paymentDate, date:joinningDate } = rows[0];
      const currentDate = new Date();
      const expDateObj = new Date(expirationDate);
      const isExpired = expDateObj < currentDate;

      let message = "";

      if (userPackage === 'Trial' && !isExpired) {
        message = `You are currently on a *Trial* package.\nYour trial expires on: ${expDateObj.toDateString()}\n\nType 'Menu' for Main Menu or 'Home' for the Assistant's Home Menu`;
      } else if (isExpired) {
        message = `🚫 Your subscription has *expired*.\n\nPackage: ${userPackage}\nSubscription Date: ${joinningDate?.toDateString() || 'N/A'}\nExpiration Date: ${expDateObj.toDateString()}\n\nTo continue using the assistant, please *renew your subscription*.\n\nSelect 'Subscription' then 'Subscribe' to view available packages and subscribe or 'Menu' for main menu.`;
      } else {
        message = `✅ Your subscription is *active*.\n\nPackage: ${userPackage}\nSubscription Date: ${paymentDate?.toDateString() || 'N/A'}\nExpiration Date: ${expDateObj.toDateString()}\n\nType 'Menu' for Main Menu or 'Home' for the Assistant's Home Menu`;
      }

      await sendTwoMessageButtonFunction(businessPhoneNumberId, user, message, "Subscription", "Menu", "subscription", "menu");
      console.log(`Subscription details sent to user: ${user}`);
    } else {
      await sendMessageFunction(
        businessPhoneNumberId,
        user,
        messageId,
        "We could not find any subscription details for your account. Please check if you are subscribed."
      );
      console.log(`No subscription found for user: ${user}`);
    }

  } catch (error) {
    console.error("Error checking subscription:", error);
    await sendMessageFunction(businessPhoneNumberId, user, messageId, "There was an error checking your subscription status. Please try again later.");
  }
}


// Add user with subscription
export async function addNewUser(user) {
  const now = new Date();
  const targetDate = new Date("2025-03-23T23:59:59");
  const packageType = getSubscriptionPackage(user);
  let expirationDate = new Date(now); // start from now by default

  const formatDate = (date) => date.toISOString().slice(0, 19).replace("T", " ");
  const paymentDate = formatDate(now);
  const paymentNumber = getPaymentNumber(user);
  const amount = getPaymentAmount(user);
  const currency = getPaymentCurrency(user);

  try {
    // Fetch existing expiration if any
    const [rows] = await connection.execute(
      'SELECT expiration_date FROM users WHERE phone = ?',
      [user]
    );

    if (rows.length > 0 && rows[0].expiration_date) {
      const existingExpiration = new Date(rows[0].expiration_date);
      if (existingExpiration > now) {
        expirationDate = new Date(existingExpiration); // extend from existing expiration
      }
    }

    // Add duration based on package
    if (packageType === "Trial") {
      expirationDate = now < targetDate ? targetDate : new Date(now.getTime() + 12 * 60 * 60 * 1000); // 12 hours from now
    } else if (packageType === "2 Weeks") {
      expirationDate.setDate(expirationDate.getDate() + 14);
    } else if (packageType === "1 Month") {
      expirationDate.setMonth(expirationDate.getMonth() + 1);
    } else if (packageType === "Basic Pack") {
      expirationDate.setMonth(expirationDate.getMonth() + 1);
    } else if (packageType === "Self Reliance Package") {
      expirationDate.setMonth(expirationDate.getMonth() + 2);
    } else if (packageType === "Exam Booster") {
      expirationDate.setMonth(expirationDate.getMonth() + 1);
    }

    const formattedExpiration = formatDate(expirationDate);

    if (packageType === "Trial") {
      // Insert only if new user
      await connection.execute(
        'INSERT IGNORE INTO users (phone, expiration_date, package) VALUES (?, ?, ?)',
        [user, formattedExpiration, packageType]
      );
    } else {
      // Update user with extended subscription
      await connection.execute(
        `UPDATE users SET payment_phone = ?, payment_date = ?, package = ?, amount = ?, expiration_date = ?, currency = ? WHERE phone = ?`,
        [paymentNumber, paymentDate, packageType, amount, formattedExpiration, currency, user]
      );
    }

    setExpiration(user, expirationDate);
    console.log(`User ${user} subscribed to ${packageType}, expiring on ${formattedExpiration}`);

  } catch (error) {
    console.error("Error adding new user:", error);
  }
}


// get user subscription message
export async function getUserSubscriptionMessage(user, businessPhoneNumberId, messageId) {
  let messageData = '';

  try {
    // Query the user's subscription details
    const [rows] = await connection.execute(
      'SELECT package, expiration_date, payment_date FROM users WHERE phone = ?',
      [user]
    );

    // Check if the user exists in the database
    if (rows.length > 0) {
      const { package: userPackage, expiration_date: expirationDate, payment_date: paymentDate } = rows[0];

      const currentDate = new Date();
      const expirationDateObj = new Date(expirationDate);

      // Calculate remaining time in milliseconds
      const remainingTime = expirationDateObj.getTime() - currentDate.getTime();
      const subscriptionStatus = expirationDateObj >= currentDate ? 'active' : 'expired';

      // Calculate time components
      const remainingDays = Math.floor(remainingTime / (1000 * 60 * 60 * 24));
      const remainingHours = Math.floor((remainingTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const remainingMinutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));

      // Format remaining time string
      const formattedTime = `${Math.max(remainingDays, 0).toString().padStart(2, '0')} Days : ${Math.max(remainingHours, 0).toString().padStart(2, '0')} Hours : ${Math.max(remainingMinutes, 0).toString().padStart(2, '0')} Minutes`;

      if (userPackage === 'Trial') {
        messageData = `You have *${formattedTime} FREE* access to the *Zim Provisional Driver's License WhatsApp Assistant*. Prepare to *ACE your VID Provisional Driver’s License Test!* 🚀\n\nStart now and get ahead! \n\nTo have unlimited access to the *Zim Provisional Driver's License WhatsApp Assistant*, select *'Subscription'* to subscribe.`;
      } else {
        messageData = `You are on a *${userPackage}* subscription package access to the *Zim Provisional Driver's License WhatsApp Assistant*. You have *${formattedTime} FREE* access. \n\nThis is your *One Stop Place* for preparing to *ACE your Provisional Driver’s License Test!* 🚀`;
      }
    } else {
      messageData = "We couldn't find your subscription record. Please try again or subscribe to get access.";
    }

  } catch (error) {
    console.error("Error checking subscription:", error);
    messageData = "An error occurred while checking your subscription. Please try again later.";
  }
  
  const label1 = "Subscription";
  const label2 = "Menu";
  const buttonId1 = "subscription";
  const buttonId2 = "main_menu";
  await markAsRead(businessPhoneNumberId, messageId);
  await sendTwoMessageButtonFunction(businessPhoneNumberId, user, messageData, label1, label2, buttonId1, buttonId2);   
          
  return messageData;
}


