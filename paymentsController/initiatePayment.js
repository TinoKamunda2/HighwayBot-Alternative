import { Paynow } from 'paynow';
import {sendMessageFunction} from '../messagesController/sendMessage.js';
import {sendFileFunction} from '../mediaController/mediaFunctions.js';
import { sendOneMessageButtonFunction, sendTwoMessageButtonFunction, sendThreeMessageButtonFunction} from '../messagesController/sendButtons.js';
import {addNewUser} from '../subscriptionController/subscription.js';
import {
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


const {integrationId, integrationKey, USD_integrationId, USD_integrationKey} = process.env;

// FUNCTION TO INNITIATE PAYNOW PAYMENT
export async function initiatePayment(businessPhoneNumberId, user, messageId) {
  const userState = userStatesMap.get(user);
  try {
    let messageState;
    let paynow;
    
    // Log the payment details being used
    console.log("Initiating payment with the following details:");
    console.log("Amount:",  userState.paymentAmount);
    console.log("Currency:", userState.paymentCurrency);
    console.log("Phone Number:", userState.paymentNumber);
    console.log("Payment Option:", userState.paymentOption);
    console.log("Subscription Package:", userState.subscriptionPackage);
    
    // Create instance of Paynow class
    if(userState.paymentCurrency === "USD"){
      paynow = new Paynow(USD_integrationId, USD_integrationKey);
    }else{
      paynow = new Paynow(integrationId, integrationKey);
    }


    // Set return and result urls
    paynow.resultUrl = 'http://www.google.com/search?q=resulturl'; // Replace with your actual result URL
    paynow.returnUrl = 'http://www.google.com/search?q=returnurl'; // Replace with your actual return URL

    

    // Check if payment details are defined
    if (!userState.paymentAmount || !userState.paymentNumber || !userState.paymentOption) {
      throw new Error("Missing payment details. Ensure amount, phone number, and payment option are set.");
    }

    // Create a new payment
    let payment = paynow.createPayment("Subscription Invoice", "studymatezw@gmail.com");

    // Add an item to the payment (e.g., subscription)
    payment.add("Zim Provisional Driver's License Whatsapp Assistant Subscription", userState.paymentAmount);

    // Log payment object details
    console.log("Payment object:", payment);

    // Initiate mobile money payment
    const response = await paynow.sendMobile(
      payment, // Pass the payment object
      userState.paymentNumber, // Subscriber number
      userState.paymentOption  // Ecocash or OneMoney
    );

    // Log the response
    console.log("Payment initiation response:", response);

    if (response && response.success) {
      //const instructions = response.instructions;
      const instructions = "Enter your EcoCash PIN on the upcoming Ecocash Prompt on your handset to authorize the transaction.";
      const pollUrl = response.pollUrl;

      // Inform the user and give payment instructions
      sendMessageFunction(businessPhoneNumberId, user, messageId, instructions);

      // Polling function
      const pollStatus = async () => {
        try {
          const status = await paynow.pollTransaction(pollUrl);

          if (status.status === 'paid') {
            let text = "";
            
            if (userState.subscriptionPackage === "Highway Code" || userState.subscriptionPackage === "Road Signs" || userState.subscriptionPackage === "Questions Bank"){
                text = "You have successfully purchased the "+userState.subscriptionPackage+".pdf.";
                const title = userState.subscriptionPackage;
                const caption = userState.subscriptionPackage;
                const filename = userState.subscriptionPackage;
                const messageText = "Select 'More Resources' to get more study material. \n\nType 'Menu' to exit to main menu.";
                const buttonText = "More Resources";
                const buttonId = "downloads";

                await sendFileFunction(businessPhoneNumberId, user, title, caption, filename, messageId, messageText, buttonText, buttonId);
                messageState = "resources";
                setMessageState(user, messageState);
                delete userState.subscriptionPackage;
              
            }else if (userState.subscriptionPackage === "Basic Pack" ){
                text = "You have successfully subscribed to the *"+ userState.subscriptionPackage +"* package of the Zim Provisional Driver's License WhatsApp Assistant. Above are the included Study Resources to get you ahead. Type or select *'Menu'* below to begin your journey to passing with ease. 🚀";
                const title1 = "Highway Code";
                const caption1 = "Highway Code";
                const filename1 = "Highway Code";
                const title2 = "Road Signs";
                const caption2 = "Road Signs";
                const filename2 = "Road Signs";
                const label = "Main Menu";
                const buttonId = "main_menu";

                await sendFileFunction(businessPhoneNumberId, user, title1, caption1, filename1, messageId);
                await sendFileFunction(businessPhoneNumberId, user, title2, caption2, filename2, messageId);
                await addNewUser(user);   
                await new Promise(resolve => setTimeout(resolve, 650));
                await sendOneMessageButtonFunction(businessPhoneNumberId, user, text, label, buttonId);
                messageState = "home";
                setMessageState(user, messageState);

                console.log("Payment status: "+ status.status);
                delete userState.subscriptionPackage;
              
            } else if (userState.subscriptionPackage === "Self Reliance Package" ){
                text = "You have successfully subscribed to the *"+ userState.subscriptionPackage +"* package of the Zim Provisional Driver's License WhatsApp Assistant. Above are the included Study Resources to get you ahead. Type or select *'Menu'* below to begin your journey to passing with ease. 🚀";
                const title1 = "Highway Code";
                const caption1 = "Highway Code";
                const filename1 = "Highway Code";
                const title2 = "Road Signs";
                const caption2 = "Road Signs";
                const filename2 = "Road Signs";
                const title3 = "Questions Bank";
                const caption3 = "Questions Bank";
                const filename3 = "Questions Bank";
                const label = "Main Menu";
                const buttonId = "main_menu";

                await sendFileFunction(businessPhoneNumberId, user, title1, caption1, filename1, messageId);
                await sendFileFunction(businessPhoneNumberId, user, title2, caption2, filename2, messageId);
                await sendFileFunction(businessPhoneNumberId, user, title3, caption3, filename3, messageId);
                await addNewUser(user);
                await new Promise(resolve => setTimeout(resolve, 650));
                await sendOneMessageButtonFunction(businessPhoneNumberId, user, text, label, buttonId);
                messageState = "home";
                setMessageState(user, messageState);

                console.log("Payment status: "+ status.status);
                delete userState.subscriptionPackage;
              
            }else if (userState.subscriptionPackage === "Exam Booster" ){
                text = "You have successfully subscribed to the *"+ userState.subscriptionPackage +"* package of the Zim Provisional Driver's License WhatsApp Assistant. Above are the included Study Resources to get you ahead. Type or select *'Menu'* below to begin your journey to passing with ease. 🚀";
                const title1 = "Highway Code";
                const caption1 = "Highway Code";
                const filename1 = "Highway Code";
                const title2 = "Road Signs";
                const caption2 = "Road Signs";
                const filename2 = "Road Signs";
                const title3 = "Questions Bank";
                const caption3 = "Questions Bank";
                const filename3 = "Questions Bank";
                const label = "Main Menu";
                const buttonId = "main_menu";
              

                await sendFileFunction(businessPhoneNumberId, user, title1, caption1, filename1, messageId);
                await sendFileFunction(businessPhoneNumberId, user, title2, caption2, filename2, messageId);
                await sendFileFunction(businessPhoneNumberId, user, title3, caption3, filename3, messageId);
                await addNewUser(user);
                await new Promise(resolve => setTimeout(resolve, 650));
                await sendOneMessageButtonFunction(businessPhoneNumberId, user, text, label, buttonId);
                messageState = "home";
                setMessageState(user, messageState);

                console.log("Payment status: "+ status.status);
                delete userState.subscriptionPackage;
              
            } else{
                const text = `You have successfully subscribed to the *${userState.subscriptionPackage}* package of the Zim Provisional Driver's License WhatsApp Assistant. Type or select *'Menu'* below to begin your journey to passing with ease. 🚀`;
                const label = "Main Menu";
                const buttonId = "main_menu"

                await addNewUser(user);             
                await sendOneMessageButtonFunction(businessPhoneNumberId, user, text, label, buttonId);
                messageState = "home";
                setMessageState(user, messageState);

                console.log("Payment status: "+ status.status);
            }        
          } else if (status.status === 'cancelled') {
            let messageData;
              if (userState.subscriptionPackage === "Highway Code" || userState.subscriptionPackage === "Road Signs" || userState.subscriptionPackage === "Questions Bank"){
                messageData = "Purchase of "+userState.subscriptionPackage+" study resource cancelled.\n\n Type 'Menu' for the Assistant's main menu or 'Home' for home menu and try subscribing again.";
              }else{
                messageData = "Subscription for "+userState.subscriptionPackage+" Zim Provisional Driver's License Whatsapp Assistant cancelled.\n\n Type 'Menu' for the Assistant's main menu or 'Home' for home menu and try subscribing again.";
              }
            sendMessageFunction(businessPhoneNumberId, user, messageId, messageData);

            console.log("Payment status: "+ status.status);

          } else {
            console.log("Payment status: "+ status.status);
            setTimeout(pollStatus, 1000); // Poll again in 1 seconds
          }
        } catch (error) {
          console.error("Error while polling transaction status:", error);
        }
      };

      pollStatus();

    } else {
      console.error("Error initiating payment:", response ? response.error : "Response is undefined");
      const messageData = "There was an error initiating your payment. Please try again. \n\nType *'Menu'* to go back to the Main Menu";
      sendMessageFunction(businessPhoneNumberId, user, messageId, messageData);
    }

  } catch (error) {
    console.error("Your application has broken an axle", error);
    const messageData = "There was an unexpected error. Please try again later.";
    sendMessageFunction(businessPhoneNumberId, user, messageId, messageData);
  }
}
