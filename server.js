
import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import connection from "./db.js";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise'; // Use `mysql2/promise` for async/await support
import FormData from 'form-data';
import crypto from 'crypto'; // For ES6 module import
import OpenAI from "openai";
import {sendHomeMenuFunction, sendMainMenuFunction } from './messagesController/menus.js';
import {sendIrideCode, sendMessageFunction} from './messagesController/sendMessage.js';
import {markAsRead} from './messagesController/markAsRead.js';
import {manageAnswers} from './questionsController/manageAnswers.js';
import {retrieveResults} from './performanceController/retrieveResults.js';
import {sendOneMessageButtonFunction, sendTwoMessageButtonFunction, sendThreeMessageButtonFunction} from './messagesController/sendButtons.js';
import {sendOptionsFunction, sendDocumentOptionsFunction } from './messagesController/interactiveLists.js';
import {savePerformance} from './performanceController/savePerformance.js';
import {calculateTimeTaken} from './performanceController/calculateTimeTaken.js';
import {sendTimedTestQuestionFunction} from './questionsController/sendTimedTestQuestion.js';
import {sendExerciseQuestionFunction} from './questionsController/sendExerciseQuestion.js';
import {sendFailedQuestion} from './questionsController/sendFailedQuestion.js';
import {sendImageMessage,sendDocumentMessage,sendDataFunction,sendFileFunction,} from './mediaController/mediaFunctions.js';
import {initiatePayment} from './paymentsController/initiatePayment.js';
import {analyzeUserPerformance} from './performanceController/analyzePerformance.js';
import {checkSubscriptionAndHandleMessage,getUserSubscriptionMessage,checkUserSubscription,checkSubscriptionFunction,addNewUser} from './subscriptionController/subscription.js';
import './appUtils/dailyTasks.js';
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
  setTotalQuestionsNumber,
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
} from './userStateManager.js';


// Function to ping the Glitch app and keep it awake
function keepAppAlive() {
  setInterval(() => {
    axios.get('https://zim-provisional-drivers-license-whatsapp.onrender.com')  // Replace with your Glitch project URL
      .then((response) => {
        console.log('Pinged successfully', response.status);
      })
      .catch((error) => {
        console.error('Error pinging app:', error);
      });
  }, 1 * 60 * 1000); // Ping every 5 minutes
}

keepAppAlive();



// Get the current directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMP_DIR = path.join(__dirname, 'temp');
const ensureTempDir = async () => { try { await fs.mkdir(TEMP_DIR, { recursive: true }); } catch {} };


dotenv.config();

const app = express();
app.use(express.json());


const { WEBHOOK_VERIFY_TOKEN, GRAPH_API_TOKEN, PORT, integrationId, integrationKey, USD_integrationId, USD_integrationKey, GITHUB_TOKEN, MY_PHONE_NUMBER_ID} = process.env;

const client = new OpenAI({
  baseURL: "https://models.inference.ai.azure.com",
  apiKey: GITHUB_TOKEN,
});


app.post("/send-code", async (req, res) => {
  console.log("Incoming send-code message:", req.body);
  try {
    const { phone, code } = req.body;

    if (!phone || !code) {
      return res.status(400).json({ success: false, message: "Phone and code are required" });
    }

    // Send the WhatsApp message
    await sendIrideCode(phone, "Your iRide verification code is *" + code + "*.");

    // ✅ Respond to the caller
    res.status(200).json({ success: true, message: "Code sent successfully" });
  } catch (error) {
    console.error("Error sending code:", error);
    res.status(500).json({ success: false, message: "Failed to send code" });
  }
});


app.post("/webhook", async (req, res) => {
  //console.log("Incoming webhook message:", JSON.stringify(req.body, null, 2));
  
  const user = req.body.entry?.[0].changes?.[0].value?.messages?.[0]?.from;
  
  if(user && req.body.entry[0].changes[0].value.metadata.phone_number_id === MY_PHONE_NUMBER_ID){
  const message = req.body.entry?.[0].changes?.[0].value?.messages?.[0];
  const businessPhoneNumberId = req.body.entry?.[0].changes?.[0].value?.metadata?.phone_number_id;
  const messageType = message?.type;
  const buttonReplyId = message?.interactive?.button_reply?.id;
  const optionReplyId = message?.interactive?.list_reply?.id;
  const messageId = message?.id;

    console.log("businessPhoneNumberId:", businessPhoneNumberId);
  initializeUserState(user);
  // Access a specific user's state
  const userState = userStatesMap.get(user);
  let messageState;
  
  const messageBody = 
    messageType === "text" ? message.text.body :
    messageType === "image" ? message.image.caption :
    messageType === "video" ? message.video.caption :
    messageType === "document" ? message.document.caption :
    messageType === "interactive" && buttonReplyId ? buttonReplyId :
    messageType === "interactive" && optionReplyId ? optionReplyId :
  null;
  

  // HELPER FUNCTIONS
  const validExercises = ["exercise_1", "exercise_2", "exercise_3"];
const validOptions = ["A", "B", "C"];

async function handleMarkAndSend(businessPhoneNumberId, user, messageId, contentFn) {
  await markAsRead(businessPhoneNumberId, messageId);
  await contentFn();
}

async function sendNextQuestion(user, businessPhoneNumberId, messageId) {
  incrementQuestionNumber(user);
  await handleMarkAndSend(businessPhoneNumberId, user, messageId, async () => {
    if(userStatesMap.get(user)?.category === "timed_test"){
      await sendTimedTestQuestionFunction(businessPhoneNumberId, user, messageId, userState.category);
    }else{
      await sendExerciseQuestionFunction(businessPhoneNumberId, user, messageId, userState.category);
    }
  });
  messageState = "answer";
  setMessageState(user, messageState);
  
}

  
  let answersCount = userState.answersCount || 0;
  let paymentOption = userState.paymentOption || {}; 
  let paymentAmount = userState.paymentAmount || {};
  let paymentCurrency = userState.paymentCurrency || {};
  let subscriptionPackage = userState.subscriptionPackage || {};
  
  if (!userStatesMap.get(user)?.messageState) {
    resetUserData(user);
          
    if (user) {
              // Check if the user is subscribed or on a trial
              const isAllowed = await checkSubscriptionAndHandleMessage(businessPhoneNumberId, user, messageId);
            }
    await markAsRead(businessPhoneNumberId, messageId);
    await getUserSubscriptionMessage(user, businessPhoneNumberId, messageId);
    messageState = "home";
    setMessageState(user, messageState);
    
  } else {
    
    switch (userStatesMap.get(user)?.messageState) {
      case "home":
        if (buttonReplyId === "subscription"){
            const text = "To have unlimited access to the *Zim Provisional Driver's License Whatsapp Assistant*, select *'Subscribe'* to subscribe.\n\nTo check your Subscription Status, select *'Check Status'*.";
            const label1 = "Subscribe";
            const label2 = "Check Status";
            const buttonId1 = "subscribe";
            const buttonId2 = "check_status";

            await markAsRead(businessPhoneNumberId, messageId);
            await sendTwoMessageButtonFunction(businessPhoneNumberId, user, text, label1, label2, buttonId1, buttonId2);
            messageState = "subscription"; 
          setMessageState(user, messageState);
          
        }else if(buttonReplyId === "main_menu"){
          console.log(`Current Message State for ${user} => ${userStatesMap.get(user)?.messageState}`);
            await markAsRead(businessPhoneNumberId, messageId);
            await sendMainMenuFunction(businessPhoneNumberId, user, messageId);
          messageState = "main_menu";
          setMessageState(user, messageState);
                  
        }else if(buttonReplyId === "menu"){
          await markAsRead(businessPhoneNumberId, messageId);
          await sendMainMenuFunction(businessPhoneNumberId, user);
          messageState = "main_menu"; 
          setMessageState(user, messageState);
        }else if(message?.text?.body?.trim().toLowerCase()){
          await markAsRead(businessPhoneNumberId, messageId);
          await sendMainMenuFunction(businessPhoneNumberId, user);
          messageState = "main_menu"; 
          setMessageState(user, messageState);
        }else{
            const text = "Invalid input. Please select 'Subscription' or 'Menu'.";
            const label1 = "Subscription";
            const label2 = "Menu";
            const buttonId1 = "subscription";
            const buttonId2 = "main_menu";

            await markAsRead(businessPhoneNumberId, messageId);
            await sendTwoMessageButtonFunction(businessPhoneNumberId, user, text, label1, label2, buttonId1, buttonId2);
          messageState = "home";
          setMessageState(user, messageState);
        }
        console.log(`Current Message State for ${user} => ${userStatesMap.get(user)?.messageState}`);
      break;
        
      case "tests_menu":
        if (buttonReplyId === "specialized_test") {
            const text = "*📝 Specialized Tests* – Sharpen your knowledge on specific topics! Choose a focused exercise to improve in key areas of the learner’s license exam. \n\n🚦 Exercise 1: Traffic Intersection Diagrams.\n\n🛑 Exercise 2: Road Signs.\n\n📚 Exercise 3: Theory.\n\nType *'Menu'* for main menu or *'Home'* for the Assistant's home menu.";
            const label1 = "Exercise 1";
            const label2 = "Exercise 2";
            const label3 = "Exercise 3";
            const buttonId1 = "exercise_1";
            const buttonId2 = "exercise_2";
            const buttonId3 = "exercise_3"; 

            await markAsRead(businessPhoneNumberId, messageId);
            await sendThreeMessageButtonFunction(businessPhoneNumberId, user, text, label1, label2, label3, buttonId1, buttonId2, buttonId3);
            
            messageState = "exercise";
          setMessageState(user, messageState);
          
          }else if (buttonReplyId === "timed_test") {
            const text = "⏳ *Timed Practice Test* – Challenge yourself under real exam conditions! This *8-Minute Timed Test* simulates the actual Provisional License Test. \n\n✅ Consistently score 100% and you are good to go! \n\n🚀 Ready?";  
            const label = "Start Test";
            const buttonId = "timed_test";
          
            await markAsRead(businessPhoneNumberId , messageId);
            await sendOneMessageButtonFunction(businessPhoneNumberId, user, text, label, buttonId);
            messageState = "exercise";
            setMessageState(user, messageState);
            
        }else if(buttonReplyId === "failed_questions"){
          
          // Fetch failed_Qtns and set as questionsLimit
            const [rows] = await connection.execute(
              "SELECT failed_Qtns FROM users WHERE phone = ?",
              [user]
            );

            let failedIds = rows[0]?.failed_Qtns || "";

            // Count valid IDs
            failedIds = failedIds
              .split(',')
              .map(id => parseInt(id.trim()))
              .filter(id => !isNaN(id));

            const totalFailed = failedIds.length;
            setTotalQuestionsNumber(user, totalFailed);
          
            if(totalFailed === 0){
              const text = "🔁 *Reattempt Failed Questions* \n\nYou’ve got *"+totalFailed+"* questions you have previously got wrong. \n\nTap *Exercises & Tests* to go back \n\nTap *Menu* to return to the main menu.";
              const label1 = "Exercises & Tests";
              const label2 = "Menu";
              const buttonId1 = "exercises";
              const buttonId2 = "main_menu";
              
              await markAsRead(businessPhoneNumberId, messageId);
              await sendTwoMessageButtonFunction(businessPhoneNumberId, user, text, label1, label2, buttonId1, buttonId2);
              
              messageState = "main_menu";
              setMessageState(user, messageState);
              
            }else{
              const text = "🔁 *Reattempt Failed Questions* \n\nYou’ve got *"+totalFailed+"* questions you previously got wrong. Ready to retry them and improve?\n\nTap *🔁Retry Questions* to begin practicing previously failed questions. Type *Stop* anytime to end the retry session early and view your results. \n\nTap *Menu* to return to the main menu.";
              const label1 = "🔁Retry Questions";
              const label2 = "Menu";
              const buttonId1 = "start_retry";
              const buttonId2 = "main_menu";
              
              await markAsRead(businessPhoneNumberId, messageId);
              await sendTwoMessageButtonFunction(businessPhoneNumberId, user, text, label1, label2, buttonId1, buttonId2);
              
              messageState = "exercise";
              setMessageState(user, messageState);
            }
          
        }else if(message?.text?.body?.trim().toLowerCase() === "home"){
            await markAsRead(businessPhoneNumberId, messageId);
            await sendHomeMenuFunction(businessPhoneNumberId, user, messageId);
            messageState = "home";
          setMessageState(user, messageState);
          
        }else{
            await markAsRead(businessPhoneNumberId, messageId);
            await sendMainMenuFunction(businessPhoneNumberId, user);
            messageState = "main_menu";
          setMessageState(user, messageState);
        }    
        
        break;
        
      case "main_menu":
        
        if (user) {
            // Check if the user is subscribed or on a trial
            const isAllowed = await checkSubscriptionAndHandleMessage(businessPhoneNumberId, user, messageId);

            if (!isAllowed) {
              // Set message state to main menu BEFORE stopping response
              setMessageState(user, "home");

              // Stop further processing
              return res.sendStatus(200);
            }
          }


        if (buttonReplyId === "exercises") {
            const text = "*⏳Timed Test & 📝Specialized Tests* – Sharpen your knowledge with *Specialized Tests* on specific topics or dive straight into *Timed Tests* and practice under real Provisional Licence Test environment. \n\nType *'Menu'* for main menu or *'Home'* for the Assistant's home menu.";
            const label1 = "📝Specialized Tests";
            const label2 = "⏳Timed Test";
            const label3 = "🔁 Retry Failed Qtns"
            const buttonId1 = "specialized_test";
            const buttonId2 = "timed_test";
            const buttonId3 = "failed_questions"

            await markAsRead(businessPhoneNumberId, messageId);
            await sendThreeMessageButtonFunction(businessPhoneNumberId, user, text, label1, label2, label3, buttonId1, buttonId2, buttonId3);
            
            messageState = "tests_menu";
          setMessageState(user, messageState);
          
        } else if (buttonReplyId === "resources"){
                const text = "*Get the following study resources:* \n1. 📚 The Highway Code \n2. 🚦 Road Signs \n3. 📋 Questions Bank (Over 500 Questions *(same as the real test)*, their answers + explanations) \n\nType 'Menu' for main menu.";
                //const text = "*Learn the important rules of the road.* \nMaster the important rules of the road and be ready to answer any question easily and correctly."
                const label1 = "Get Resources";
                const label2 = "Road Rules"; // change this one to label2
                //const label2 = "Main Menu";
                const buttonId1 = "downloads";
                const buttonId2 = "road_rules"; //change this one to buttonId2
                //const buttonId2 = "main_menu";
                await markAsRead(businessPhoneNumberId, messageId);
                await sendTwoMessageButtonFunction(businessPhoneNumberId, user, text, label1, label2, buttonId1, buttonId2);
                messageState = "resources";
          setMessageState(user, messageState);
        } else if (buttonReplyId === "track_perfomance" ) {
          await markAsRead(businessPhoneNumberId, messageId);
          await analyzeUserPerformance(user, businessPhoneNumberId, messageId); 
          messageState = "home";
          setMessageState(user, messageState);
        
        }else if(message?.text?.body?.trim().toLowerCase() === "home"){
          await markAsRead(businessPhoneNumberId, messageId);
          await sendHomeMenuFunction(businessPhoneNumberId, user, messageId);
          messageState = "home";
          setMessageState(user, messageState);
          
        }else{
            await markAsRead(businessPhoneNumberId, messageId);
            await sendMainMenuFunction(businessPhoneNumberId, user);
            messageState = "main_menu"; 
          setMessageState(user, messageState);
        }
        break;
    
        
        case "resources":
        if (buttonReplyId === "downloads"){
          
            await markAsRead(businessPhoneNumberId, messageId);
            sendDocumentOptionsFunction(businessPhoneNumberId, user)

            messageState = "ask_for_payment_phone";
          setMessageState(user, messageState);
          
        }else if (buttonReplyId === "road_rules"){
            const title = 'highway_code'; // Fetch highway_code
            const text = "Next: 1. Introduction \n\nEnter topic number(1, 2, 3... or 7) to jump to topic.";
            const label = "Proceed";
            const buttonId = "introduction";

            await markAsRead(businessPhoneNumberId, messageId);
            await sendDataFunction(businessPhoneNumberId, user, messageId, title, text, label, buttonId);
            messageState = "highway_code_intro";
          setMessageState(user, messageState);
        }else if(message?.text?.body?.trim().toLowerCase()==="menu"){
            await markAsRead(businessPhoneNumberId, messageId);
            await sendMainMenuFunction(businessPhoneNumberId, user);
            messageState = "main_menu"; 
          setMessageState(user, messageState);
        }else{
            const text = "*Invalid input.* \n\nPlease select *'Get Resources'* or *'Road Rules'*. \n\nType 'Menu' to go back to main menu.";   
            const label1 = "Get Resources";
            const label2 = "Road Rules"; 
            const buttonId1 = "downloads";
            const buttonId2 = "road_rules";
            await markAsRead(businessPhoneNumberId, messageId);
            await sendTwoMessageButtonFunction(businessPhoneNumberId, user, text, label1, label2, buttonId1, buttonId2);
            messageState = "resources"; 
          setMessageState(user, messageState);
        }
        
        break;
        

      case "highway_code_intro":
        if (buttonReplyId === "introduction" || (message?.text?.body?.trim().toLowerCase() === "1")) {
            const title = 'introduction'; 
            const text = "Next: 2. Test Common Mistakes";
            const label = "Proceed";
            const buttonId = "test_mistakes"

            await markAsRead(businessPhoneNumberId, messageId);
            await sendDataFunction(businessPhoneNumberId, user, messageId, title, text, label, buttonId);
            messageState = "test_mistakes";
          setMessageState(user, messageState);
          
        } else if(message?.text?.body?.trim().toLowerCase() === "2"){
              const title = 'test_mistakes'; 
              const text = "Next: 3. Five (5) Rules for Solving or Answering Car Diagrams";
              const label = "Proceed";
              const buttonId = "five_rules"

              await markAsRead(businessPhoneNumberId, messageId);
              await sendDataFunction(businessPhoneNumberId, user, messageId, title, text, label, buttonId);
              messageState = "five_rules";
          setMessageState(user, messageState);
          
        } else if(message?.text?.body?.trim().toLowerCase() === "3"){
            const title = 'five_rules'; 
            const text = "Next: 4. Controlled intersections";
            const label = "Proceed";
            const buttonId = "Controlled_intersections"

            await markAsRead(businessPhoneNumberId, messageId);
            await sendDataFunction(businessPhoneNumberId, user, messageId, title, text, label, buttonId);
            messageState = "Controlled_intersections";
          setMessageState(user, messageState);
        
        } else if(message?.text?.body?.trim().toLowerCase() === "4"){
            const title = 'Controlled_intersections'; // Fetch highway_code
            const text = "Next: 5. Understanding Car Diagram Questions";
            const label = "Proceed";
            const buttonId = "understanding_car_diagram_questions"

            await markAsRead(businessPhoneNumberId, messageId);
            await sendDataFunction(businessPhoneNumberId, user, messageId, title, text, label, buttonId);
            messageState= "understanding_car_diagram_questions";
          
        } else if(message?.text?.body?.trim().toLowerCase() === "5"){
            const title = 'understanding_car_diagram_questions'; // Fetch highway_code
            const text = "Next: 6. Summary - Points to Keep in Mind";
            const label = "Proceed";
            const buttonId = "summary"

            await markAsRead(businessPhoneNumberId, messageId);
            await sendDataFunction(businessPhoneNumberId, user, messageId, title, text, label, buttonId);
            messageState= "summary";
          
        } else if(message?.text?.body?.trim().toLowerCase() === "6"){
            const title = 'summary'; // Fetch highway_code
            const text = "Proceed to Practice Exercise or Exit to Main Menu";
            const label1 = "Practice Exercise ";
            const label2 = "Main menu";
            const buttonId1 = "tests"
            const buttonId2 = "main_menu"

            await markAsRead(businessPhoneNumberId, messageId);
            await sendDataFunction(businessPhoneNumberId, user, messageId, title);
            await sendTwoMessageButtonFunction(businessPhoneNumberId, user, text, label1, label2, buttonId1, buttonId2);
            messageState = "highway_code_end";
          setMessageState(user, messageState);
          
        } else if(message?.text?.body?.trim().toLowerCase() === "7"){
            const text = "*7. 📝 *Specialized Tests* – Sharpen your knowledge on specific topics! Choose a focused exercise to improve in key areas of the learner’s license exam. \n\nExercise 1: Car Diagrams. \n\nExercise 2: Road Signs. \n\nExercise 3: Theory. \n\nType *'Menu'* for main menu or *'Home'* for the Assistant's home menu.";
            const label1 = "Exercise 1";
            const label2 = "Exercise 2";
            const label3 = "Exercise 3";
            const buttonId1 = "exercise_1";
            const buttonId2 = "exercise_2";
            const buttonId3 = "exercise_3"; 

            await markAsRead(businessPhoneNumberId, messageId);
            await sendThreeMessageButtonFunction(businessPhoneNumberId, user, text, label1, label2, label3, buttonId1, buttonId2, buttonId3);
            
            messageState = "exercise";
          setMessageState(user, messageState);
          
        }else if(message?.text?.body?.trim().toLowerCase() === "home"){
          await markAsRead(businessPhoneNumberId, messageId);
          await sendHomeMenuFunction(businessPhoneNumberId, user, messageId);
          messageState = "home";
          setMessageState(user, messageState);
          
        }else {
            await markAsRead(businessPhoneNumberId, messageId);
            await sendMainMenuFunction(businessPhoneNumberId, user);
            messageState = "main_menu"; 
          setMessageState(user, messageState);
        }
        break;
        
        case "test_mistakes":
        if (buttonReplyId === "test_mistakes") {
            const title = 'test_mistakes'; 
            const text = "Next: 3. Five (5) Rules for Solving or Answering Car Diagrams";
            const label = "Proceed";
            const buttonId = "five_rules"

            await markAsRead(businessPhoneNumberId, messageId);
            await sendDataFunction(businessPhoneNumberId, user, messageId, title, text, label, buttonId);
            messageState = "five_rules";
          setMessageState(user, messageState);
          
        }else if(message?.text?.body?.trim().toLowerCase() === "home"){
          await markAsRead(businessPhoneNumberId, messageId);
          await sendHomeMenuFunction(businessPhoneNumberId, user, messageId);
          messageState = "home";
          setMessageState(user, messageState);
          
        } else {
            await markAsRead(businessPhoneNumberId, messageId);
            await sendMainMenuFunction(businessPhoneNumberId, user);
            messageState = "main_menu"; 
          setMessageState(user, messageState);
        }
        break;
        
        case "five_rules":
        if (buttonReplyId === "five_rules") {
            const title = 'five_rules'; 
            const text = "Next: 4. Controlled intersections";
            const label = "Proceed";
            const buttonId = "Controlled_intersections"

            await markAsRead(businessPhoneNumberId, messageId);
            await sendDataFunction(businessPhoneNumberId, user, messageId, title, text, label, buttonId);
            messageState = "Controlled_intersections";
          setMessageState(user, messageState);
          
        }else if(message?.text?.body?.trim().toLowerCase() === "home"){
          await markAsRead(businessPhoneNumberId, messageId);
          await sendHomeMenuFunction(businessPhoneNumberId, user, messageId);
          messageState = "home";
          setMessageState(user, messageState);
          
        } else {
            await markAsRead(businessPhoneNumberId, messageId);
            await sendMainMenuFunction(businessPhoneNumberId, user);
            messageState = "main_menu"; 
          setMessageState(user, messageState);
        }
        break;
        
        case "Controlled_intersections":
        if (buttonReplyId === "Controlled_intersections") {
            const title = 'Controlled_intersections'; // Fetch highway_code
            const text = "Next: 5. Understanding Car Diagram Questions";
            const label = "Proceed";
            const buttonId = "understanding_car_diagram_questions"

            await markAsRead(businessPhoneNumberId, messageId);
            await sendDataFunction(businessPhoneNumberId, user, messageId, title, text, label, buttonId);
            messageState = "understanding_car_diagram_questions";
          setMessageState(user, messageState);
          
        }else if(message?.text?.body?.trim().toLowerCase() === "home"){
          await markAsRead(businessPhoneNumberId, messageId);
          await sendHomeMenuFunction(businessPhoneNumberId, user, messageId);
          messageState = "home";
          setMessageState(user, messageState);
          
        } else {
            await markAsRead(businessPhoneNumberId, messageId);
            await sendMainMenuFunction(businessPhoneNumberId, user);
            messageState = "main_menu"; 
          setMessageState(user, messageState);
        }
        break;
        
        case "understanding_car_diagram_questions":
        if (buttonReplyId === "understanding_car_diagram_questions") {
            const title = 'understanding_car_diagram_questions'; // Fetch highway_code
            const text = "Next: 6. Summary - Points to Keep in Mind";
            const label = "Proceed";
            const buttonId = "summary"

            await markAsRead(businessPhoneNumberId, messageId);
            await sendDataFunction(businessPhoneNumberId, user, messageId, title, text, label, buttonId);
            messageState = "summary";
          setMessageState(user, messageState);
          
        }else if(message?.text?.body?.trim().toLowerCase() === "home"){
          await markAsRead(businessPhoneNumberId, messageId);
          await sendHomeMenuFunction(businessPhoneNumberId, user, messageId);
          messageState = "home";
          setMessageState(user, messageState);
          
        } else {
            await markAsRead(businessPhoneNumberId, messageId);
            await sendMainMenuFunction(businessPhoneNumberId, user);
            messageState = "main_menu"; 
          setMessageState(user, messageState);
        }
        break;
        
        case "summary":
        if (buttonReplyId === "summary") {
            const title = 'summary'; // Fetch highway_code
            const text = "Proceed to Practice Exercise or Exit to Main Menu";
            const label1 = "Practice Exercise";
            const label2 = "Main menu";
            const buttonId1 = "tests"
            const buttonId2 = "main_menu"

            await markAsRead(businessPhoneNumberId, messageId);
            await sendDataFunction(businessPhoneNumberId, user, messageId, title);
            await sendTwoMessageButtonFunction(businessPhoneNumberId, user, text, label1, label2, buttonId1, buttonId2);
            messageState = "highway_code_end";
          setMessageState(user, messageState);
          
        } else {
            await markAsRead(businessPhoneNumberId, messageId);
            await sendMainMenuFunction(businessPhoneNumberId, user);
            messageState = "main_menu"; 
          setMessageState(user, messageState);
        }
        break;
        
        
        case "highway_code_end":
        if (buttonReplyId === "tests") {
            const text = "*7. 📝 Specialized Tests* – Sharpen your knowledge on specific topics! Choose a focused exercise to improve in key areas of the learner’s license exam. \n\n🚦 Exercise 1: Traffic Intersection Diagrams.\n\n🛑 Exercise 2: Road Signs.\n\n📚 Exercise 3: Theory.\n\nType *'Menu'* for main menu or *'Home'* for the Assistant's home menu.";
            const label1 = "Exercise 1";
            const label2 = "Exercise 2";
            const label3 = "Exercise 3";
            const buttonId1 = "exercise_1";
            const buttonId2 = "exercise_2";
            const buttonId3 = "exercise_3"; 

            await markAsRead(businessPhoneNumberId, messageId);
            await sendThreeMessageButtonFunction(businessPhoneNumberId, user, text, label1, label2, label3, buttonId1, buttonId2, buttonId3);
            
            messageState = "exercise";
          setMessageState(user, messageState);
          
        } else if(buttonReplyId === "timed_test"){
            const text = "⏳ *That's the spirit!* Keep on challenging yourself under real exam conditions! This *8-Minute Timed Test* simulates the actual Provisional License Test. \n\n✅ Consistently score 100% and you are good to go! \n\n🚀 Ready?";
            const label = "Start Test";
            const buttonId = "timed_test";
          
            await markAsRead(businessPhoneNumberId, messageId);
            await sendOneMessageButtonFunction(businessPhoneNumberId, user, text, label, buttonId);
            messageState = "exercise";
          setMessageState(user, messageState);
          
        }else if(buttonReplyId === "failed_questions"){
          
          // Fetch failed_Qtns and set as questionsLimit
            const [rows] = await connection.execute(
              "SELECT failed_Qtns FROM users WHERE phone = ?",
              [user]
            );

            let failedIds = rows[0]?.failed_Qtns || "";

            // Count valid IDs
            failedIds = failedIds
              .split(',')
              .map(id => parseInt(id.trim()))
              .filter(id => !isNaN(id));

            const totalFailed = failedIds.length;
            setTotalQuestionsNumber(user, totalFailed);
          
            if(totalFailed === 0){
              const text = "🔁 *Reattempt Failed Questions* \n\nYou’ve got *"+totalFailed+"* questions you have previously got wrong. \n\nTap *Exercises & Tests* to go back \n\nTap *Menu* to return to the main menu.";
              const label1 = "Exercises & Tests";
              const label2 = "Menu";
              const buttonId1 = "exercises";
              const buttonId2 = "main_menu";
              
              await markAsRead(businessPhoneNumberId, messageId);
              await sendTwoMessageButtonFunction(businessPhoneNumberId, user, text, label1, label2, buttonId1, buttonId2);
              
              messageState = "main_menu";
              setMessageState(user, messageState);
              
            }else{
              const text = "🔁 *Reattempt Failed Questions* \n\nYou’ve got *"+totalFailed+"* questions you previously got wrong. Ready to retry them and improve?\n\nTap *🔁Retry Questions* to begin practicing previously failed questions. Type *Stop* anytime to end the retry session early and view your results. \n\nTap *Menu* to return to the main menu.";
              const label1 = "🔁Retry Questions";
              const label2 = "Menu";
              const buttonId1 = "start_retry";
              const buttonId2 = "main_menu";
              
              await markAsRead(businessPhoneNumberId, messageId);
              await sendTwoMessageButtonFunction(businessPhoneNumberId, user, text, label1, label2, buttonId1, buttonId2);
              
              messageState = "exercise";
              setMessageState(user, messageState);
            }
          
        }else if(message?.text?.body?.trim().toLowerCase() === "home"){
          await markAsRead(businessPhoneNumberId, messageId);
          await sendHomeMenuFunction(businessPhoneNumberId, user, messageId);
          messageState = "home";
          setMessageState(user, messageState);
          
        } else{
            await markAsRead(businessPhoneNumberId, messageId);
            await sendMainMenuFunction(businessPhoneNumberId, user);
            messageState = "main_menu";
          setMessageState(user, messageState);
        }
        break;
        
        
        case "exercise": {
          const text = message?.text?.body?.trim().toUpperCase();

          if (buttonReplyId === "timed_test") {
            setCategory(user, buttonReplyId);
            setQuestionsLimit(user, "25");              // 25 questions like the old version
            setTimeLimit(user, 8);                      // 8-minute time limit
            incrementQuestionNumber(user);
            userState.answersCount = 0;

            if (userState.timerID) clearTimeout(userState.timerID);
            userState.timerID = setTimeout(async () => {
              await markAsRead(businessPhoneNumberId, messageId);
              await sendOneMessageButtonFunction(
                businessPhoneNumberId, user,
                "Time is up! Test complete.", "View Results", "view_results"
              );
              await calculateTimeTaken(user);
              messageState = "test_complete";
              setMessageState(user, messageState);
              setTestCompletionState(user, messageState);
              console.log("Time expired. Test complete. Message state:", messageState);
              await savePerformance(user);
              console.log("Performance stats saved for user:", user);
            }, userState.timeLimit * 60 * 1000);

            await markAsRead(businessPhoneNumberId, messageId);
            await sendTimedTestQuestionFunction(businessPhoneNumberId, user, messageId, userState.category);

            messageState = "answer";
            setMessageState(user, messageState);
            console.log("Message state:", messageState);
          } else if (
            buttonReplyId === "exercise_1" ||
            buttonReplyId === "exercise_2" ||
            buttonReplyId === "exercise_3" ||
            text === "1" || text === "2" || text === "3"
          ) {
            let selectedExercise;
            if (text === "1") selectedExercise = "exercise_1";
            else if (text === "2") selectedExercise = "exercise_2";
            else if (text === "3") selectedExercise = "exercise_3";

            const exercise = buttonReplyId || selectedExercise;
            setCategory(user, exercise);
            setQuestionsLimit(user, "25");              // Also 25 questions like old code
            incrementQuestionNumber(user);
            userState.answersCount = 0;

            await markAsRead(businessPhoneNumberId, messageId);
            await sendExerciseQuestionFunction(businessPhoneNumberId, user, messageId, userState.category);

            messageState = "answer";
            setMessageState(user, messageState);
            console.log("Message state:", messageState);
            
          }else if (buttonReplyId === "start_retry") {
            setCategory(user, "failed_questions");
            initializeUserState(user);
            userState.answersCount = 0;
            incrementQuestionNumber(user);

            // Fetch failed_Qtns and set as questionsLimit
            const [rows] = await connection.execute(
              "SELECT failed_Qtns FROM users WHERE phone = ?",
              [user]
            );

            let failedIds = rows[0]?.failed_Qtns || "";

            // Count valid IDs
            failedIds = failedIds
              .split(',')
              .map(id => parseInt(id.trim()))
              .filter(id => !isNaN(id));

            const totalFailed = failedIds.length;

            if (totalFailed === 0) {
              await markAsRead(businessPhoneNumberId, messageId);
              await sendMessageFunction(
                businessPhoneNumberId,
                user,
                messageId,
                "🎉 You currently have no failed questions to retry. Great job! Type *Menu* to go back."
              );
              messageState = "main_menu";
              setMessageState(user, messageState);
              return;
            }

            setQuestionsLimit(user, totalFailed.toString());

            await markAsRead(businessPhoneNumberId, messageId);
            await sendFailedQuestion(businessPhoneNumberId, user, messageId);

            messageState = "answer";
            setMessageState(user, messageState);
            console.log("Retry Failed Questions started. Limit set to:", totalFailed);
          
          }else if (message?.text?.body?.trim().toLowerCase() === "home") {
            await markAsRead(businessPhoneNumberId, messageId);
            await sendHomeMenuFunction(businessPhoneNumberId, user, messageId);
            messageState = "home";
            setMessageState(user, messageState);
          } else {
            await markAsRead(businessPhoneNumberId, messageId);
            await sendMainMenuFunction(businessPhoneNumberId, user);
            messageState = "main_menu";
            setMessageState(user, messageState);
            console.log("Message state:", messageState);
          }
          break;
        }


      case "answer": {
        const text = message?.text?.body?.trim().toUpperCase();
        const isValidAnswer = validOptions.includes(buttonReplyId) || validOptions.includes(text);
        const provided_answer = buttonReplyId || text;

        if (isValidAnswer) {
          userState.answersCount = (userState.answersCount || 0) + 1;

          if (userState.category === "timed_test") {
            if (userState.answersCount < userState.questionsLimit) {
              await markAsRead(businessPhoneNumberId, messageId);
              await manageAnswers(user, provided_answer);
              incrementQuestionNumber(user);
              await sendTimedTestQuestionFunction(businessPhoneNumberId, user, messageId, userState.category);
            } else {
              if (userState.timerID) clearTimeout(userState.timerID);
              await calculateTimeTaken(user);
              await markAsRead(businessPhoneNumberId, messageId);
              await manageAnswers(user, provided_answer);
              await sendOneMessageButtonFunction(businessPhoneNumberId, user, "Test complete!", "View Results", "view_results");
              messageState = "test_complete";
              setMessageState(user, messageState);
              setTestCompletionState(user, messageState);
              console.log("Test complete. Message state:", messageState);
              await savePerformance(user);
              console.log("Performance stats saved for user:", user);
            }
            
          }else if (userState.category === "failed_questions") {
            
             if (userState.answersCount < userState.questionsLimit) {
              await markAsRead(businessPhoneNumberId, messageId);
              await manageAnswers(user, provided_answer);
              incrementQuestionNumber(user);
              await sendFailedQuestion(businessPhoneNumberId, user, messageId);
            } else {
              await markAsRead(businessPhoneNumberId, messageId);
              await manageAnswers(user, provided_answer);
              await sendOneMessageButtonFunction(
                businessPhoneNumberId,
                user,
                "✅ Retry session complete!",
                "View Results",
                "view_results"
              );

              messageState = "test_complete";
              setMessageState(user, messageState);
              setTestCompletionState(user, messageState);
              console.log("Retry complete. Message state:", messageState);

              await savePerformance(user);
              
              console.log("Retry performance stats saved for user:", user);
            }

          } else {
            // For non-timed exercises
            await handleMarkAndSend(businessPhoneNumberId, user, messageId, async () => {
              await manageAnswers(user, provided_answer);
              const correct = userState.correctAnswer;
              const explanation = userState.explanation || "";
              const isCorrect = correct === provided_answer;
              const feedback = isCorrect
                ? `✅ *Correct!*\n\n${explanation}`
                : `❌ *Incorrect*. Correct answer: *${correct}*.\n\n${explanation}`;
              await sendOneMessageButtonFunction(businessPhoneNumberId, user,feedback, "Next", "next_question");
            });
            messageState = "exercise_next_question";
            setMessageState(user, messageState);
          }
          
          } else if (message?.text?.body?.trim().toLowerCase() === "menu") {
            if (userState.timerID) {
                clearTimeout(userState.timerID);
              }
            await handleMarkAndSend(businessPhoneNumberId, user, messageId, async () => {
              await sendMessageFunction(businessPhoneNumberId, user, messageId, "You have Quit the test/exercise.");
              await sendMainMenuFunction(businessPhoneNumberId, user);
            });
            await savePerformance(user);
            resetUserData(user);
            messageState = "main_menu";
            setMessageState(user, messageState);
            
          } else if (userState.answersCount < userState.questionsLimit && message?.text?.body?.trim().toLowerCase() === "stop"){
              await markAsRead(businessPhoneNumberId, messageId);
              await sendOneMessageButtonFunction(
                businessPhoneNumberId,
                user,
                "🔁 Retry session Stopped!",
                "View Results",
                "view_results"
              );

              messageState = "test_complete";
              setMessageState(user, messageState);
              setTestCompletionState(user, messageState);
              console.log("Retry Stopped. Message state:", messageState);

              await savePerformance(user);
              
              console.log("Retry performance stats saved for user:", user);
              
            }else{
              
            await handleMarkAndSend(businessPhoneNumberId, user, messageId, async () => {
              await sendMessageFunction(businessPhoneNumberId, user, messageId, "Invalid input. Choose either A, B or C.");
            });
            messageState = "answer";
            setMessageState(user, messageState);
          }
        break;
      }


  case "exercise_next_question": {
    const text = message?.text?.body?.trim().toLowerCase();
    if (buttonReplyId === "next_question") {
      if (userState.answersCount < userState.questionsLimit) {
        await sendNextQuestion(user, businessPhoneNumberId, messageId);
      } else {
        await handleMarkAndSend(businessPhoneNumberId, user, messageId, async () => {
          await sendOneMessageButtonFunction(businessPhoneNumberId, user, "Test complete!", "View Results", "view_results");
        });
        messageState = "test_complete";
        setMessageState(user, messageState);
        setTestCompletionState(user, messageState);
        await savePerformance(user);
      }
    } else if (text === "menu") {
      await handleMarkAndSend(businessPhoneNumberId, user, messageId, async () => {
        await sendMessageFunction(businessPhoneNumberId, user, messageId, "You have Quit the test/exercise.");
        await sendMainMenuFunction(businessPhoneNumberId, user);
        messageState = "main_menu";
        setMessageState(user, messageState);
      });
      
      await savePerformance(user);
      resetUserData(user);
      messageState = "main_menu";
      setMessageState(user, messageState);
    } else {
      await handleMarkAndSend(businessPhoneNumberId, user, messageId, async () => {
        await sendOneMessageButtonFunction(businessPhoneNumberId, user, "Invalid input. Click 'Next' to continue to next question.", "Next", "next_question");
      });
    }
    break;
  }

  case "test_complete": {
    if (buttonReplyId === "view_results") {
      await handleMarkAndSend(businessPhoneNumberId, user, messageId, async () => {
        await retrieveResults(businessPhoneNumberId, user, messageId);
      });
      messageState = "highway_code_end";
      setMessageState(user, messageState);
    } else {
      await handleMarkAndSend(businessPhoneNumberId, user, messageId, async () => {
        await sendOneMessageButtonFunction(businessPhoneNumberId, user, "Invalid input. Select 'View Results'", "View Results", "view_results");
      });
    }
    break;
  }
      case "subscription":
        if(buttonReplyId === "subscribe"){
          const title = "testFile";
          const caption = "test caption";
          const filename = "testFile";
          const buttonText = "test bustton";
          const buttonId = "test_bustton";
          
          //await sendFileFunction(businessPhoneNumberId, user, title, caption, filename, messageId, buttonText, buttonId);
          await markAsRead(businessPhoneNumberId, messageId);
          await sendOptionsFunction(businessPhoneNumberId, user);
          messageState = "ask_for_payment_phone";
          setMessageState(user, messageState);
        
        }else if(buttonReplyId === "check_status"){
          await markAsRead(businessPhoneNumberId, messageId);
          await checkSubscriptionFunction(businessPhoneNumberId, user, messageId);
          messageState = "home";    
          setMessageState(user, messageState);
        }else{
          await markAsRead(businessPhoneNumberId, messageId);
          await sendMainMenuFunction(businessPhoneNumberId, user);
          messageState = "main_menu"; 
          setMessageState(user, messageState);
        }
        
        break;
        
      case "ask_for_payment_phone":
        const messageData = "Enter your *ECOCASH* mobile number in the form 077xxxxxxx. \n\nType *'Menu'* to go back to the Main Menu"
          if(optionReplyId === "zwg_ecocash_2weeks"){
            setPaymentOption(user,"ecocash");
            setPaymentAmount(user, 82);
            setPaymentCurrency(user, "ZWL");
            setSubscriptionPackage(user,"2 Weeks");
            
            
            await markAsRead(businessPhoneNumberId, messageId);
            await sendMessageFunction(businessPhoneNumberId, user, messageId, messageData);
            messageState = "payment_confirmation";  
            setMessageState(user, messageState);
            
          }else if(optionReplyId === "usd_ecocash_2weeks"){
            setPaymentOption(user,"ecocash");
            setPaymentAmount(user, 2.05);
            setPaymentCurrency(user, "USD");
            setSubscriptionPackage(user,"2 Weeks");
            
            await markAsRead(businessPhoneNumberId, messageId);
            await sendMessageFunction(businessPhoneNumberId, user, messageId, messageData);
            messageState = "payment_confirmation";  
            setMessageState(user, messageState);
            
          }else if(optionReplyId === "zwg_ecocash_1month"){
            setPaymentOption(user,"ecocash");
            setPaymentAmount(user, 122);
            setPaymentCurrency(user, "ZWL");
            setSubscriptionPackage(user,"1 Month");
            
            await markAsRead(businessPhoneNumberId, messageId);
            await sendMessageFunction(businessPhoneNumberId, user, messageId, messageData);
            messageState = "payment_confirmation";  
            setMessageState(user, messageState);
            
          }else if(optionReplyId === "usd_ecocash_1month"){
            setPaymentOption(user,"ecocash");
            setPaymentAmount(user, 3.05);
            setPaymentCurrency(user, "USD");
            setSubscriptionPackage(user,"1 Month");
            
            await markAsRead(businessPhoneNumberId, messageId);
            await sendMessageFunction(businessPhoneNumberId, user, messageId, messageData);
            messageState = "payment_confirmation";  
            setMessageState(user, messageState);
            
            
          }else if(optionReplyId === "usd_ecocash_highway_code"){
            setPaymentOption(user,"ecocash");
            setPaymentAmount(user, 2.05);
            setPaymentCurrency(user, "USD");
            setSubscriptionPackage(user,"Highway Code");
            
            await markAsRead(businessPhoneNumberId, messageId);
            await sendMessageFunction(businessPhoneNumberId, user, messageId, messageData);
            messageState = "payment_confirmation";  
            setMessageState(user, messageState);
            
            
          }else if(optionReplyId === "zwg_ecocash_highway_code"){
            setPaymentOption(user,"ecocash");
            setPaymentAmount(user, 82);
            setPaymentCurrency(user, "ZWL");
            setSubscriptionPackage(user,"Highway Code");
            
            await markAsRead(businessPhoneNumberId, messageId);
            await sendMessageFunction(businessPhoneNumberId, user, messageId, messageData);
            messageState = "payment_confirmation";  
            setMessageState(user, messageState);
            
            
          }else if(optionReplyId === "usd_ecocash_road_signs"){
            setPaymentOption(user,"ecocash");
            setPaymentAmount(user, 2.05);
            setPaymentCurrency(user, "USD");
            setSubscriptionPackage(user,"Road Signs");
            
            await markAsRead(businessPhoneNumberId, messageId);
            await sendMessageFunction(businessPhoneNumberId, user, messageId, messageData);
            messageState = "payment_confirmation";  
            setMessageState(user, messageState);
            
            
          }else if(optionReplyId === "zwg_ecocash_road_signs"){
            setPaymentOption(user,"ecocash");
            setPaymentAmount(user, 82);
            setPaymentCurrency(user, "ZWL");
            setSubscriptionPackage(user,"Road Signs");
            
            await markAsRead(businessPhoneNumberId, messageId);
            await sendMessageFunction(businessPhoneNumberId, user, messageId, messageData);
            messageState = "payment_confirmation";  
            setMessageState(user, messageState);
            
            
          }else if(optionReplyId === "usd_ecocash_questions_bank"){
            setPaymentOption(user,"ecocash");
            setPaymentAmount(user, 3.10);
            setPaymentCurrency(user, "USD");
            setSubscriptionPackage(user,"Questions Bank");
            
            await markAsRead(businessPhoneNumberId, messageId);
            await sendMessageFunction(businessPhoneNumberId, user, messageId, messageData);
            messageState = "payment_confirmation";  
            setMessageState(user, messageState);
            
            
          }else if(optionReplyId === "zwg_ecocash_questions_bank"){
            setPaymentOption(user,"ecocash");
            setPaymentAmount(user, 124);
            setPaymentCurrency(user, "ZWL");
            setSubscriptionPackage(user,"Questions Bank");
            
            await markAsRead(businessPhoneNumberId, messageId);
            await sendMessageFunction(businessPhoneNumberId, user, messageId, messageData);
            
            messageState = "payment_confirmation";
            setMessageState(user, messageState);
            
      ////Bundles//////
            
          }else if(optionReplyId === "usd_starter"){
            setPaymentOption(user,"ecocash");
            setPaymentAmount(user, 3.55);
            setPaymentCurrency(user, "USD");
            setSubscriptionPackage(user,"Basic Pack");
            
            await markAsRead(businessPhoneNumberId, messageId);
            await sendMessageFunction(businessPhoneNumberId, user, messageId, messageData);
            messageState = "payment_confirmation";  
            setMessageState(user, messageState);
            
            
          }else if(optionReplyId === "zwg_starter"){
            setPaymentOption(user,"ecocash");
            setPaymentAmount(user, 142);
            setPaymentCurrency(user, "ZWL");
            setSubscriptionPackage(user,"Basic Pack");
            
            await markAsRead(businessPhoneNumberId, messageId);
            await sendMessageFunction(businessPhoneNumberId, user, messageId, messageData);
            messageState = "payment_confirmation";  
            setMessageState(user, messageState);
            
            
          }else if(optionReplyId === "usd_essentials"){
            setPaymentOption(user,"ecocash");
            setPaymentAmount(user, 2.50);
            setPaymentCurrency(user, "USD");
            setSubscriptionPackage(user,"Essentials Combo");
            
            await markAsRead(businessPhoneNumberId, messageId);
            await sendMessageFunction(businessPhoneNumberId, user, messageId, messageData);
            messageState = "payment_confirmation";  
            setMessageState(user, messageState);
            
            
          }else if(optionReplyId === "zwg_essentials"){
            setPaymentOption(user,"ecocash");
            setPaymentAmount(user, 100);
            setPaymentCurrency(user, "ZWL");
            setSubscriptionPackage(user,"Essentials Combo");
            
            await markAsRead(businessPhoneNumberId, messageId);
            await sendMessageFunction(businessPhoneNumberId, user, messageId, messageData);
            messageState = "payment_confirmation";  
            setMessageState(user, messageState);
            
            
          }else if(optionReplyId === "usd_self_reliance"){
            setPaymentOption(user,"ecocash");
            setPaymentAmount(user, 4.50);
            setPaymentCurrency(user, "USD");
            setSubscriptionPackage(user,"Self Reliance Package");
            
            await markAsRead(businessPhoneNumberId, messageId);
            await sendMessageFunction(businessPhoneNumberId, user, messageId, messageData);
            messageState = "payment_confirmation";  
            setMessageState(user, messageState);
            
            
          }else if(optionReplyId === "zwg_self_reliance"){
            setPaymentOption(user,"ecocash");
            setPaymentAmount(user, 180);
            setPaymentCurrency(user, "ZWL");
            setSubscriptionPackage(user,"Self Reliance Package");
            
            await markAsRead(businessPhoneNumberId, messageId);
            await sendMessageFunction(businessPhoneNumberId, user, messageId, messageData);
            messageState = "payment_confirmation";  
            setMessageState(user, messageState);
            
            
          }else if(optionReplyId === "usd_exam_booster"){
            setPaymentOption(user,"ecocash");
            setPaymentAmount(user, 4.05);
            setPaymentCurrency(user, "USD");
            setSubscriptionPackage(user,"Exam Booster");
            
            await markAsRead(businessPhoneNumberId, messageId);
            await sendMessageFunction(businessPhoneNumberId, user, messageId, messageData);
            messageState = "payment_confirmation";  
            setMessageState(user, messageState);
            
          }else if(optionReplyId === "zwg_exam_booster"){
            setPaymentOption(user,"ecocash");
            setPaymentAmount(user, 162);
            setPaymentCurrency(user, "ZWL");
            setSubscriptionPackage(user,"Exam Booster");
            
            await markAsRead(businessPhoneNumberId, messageId);
            await sendMessageFunction(businessPhoneNumberId, user, messageId, messageData);
            messageState = "payment_confirmation";  
            setMessageState(user, messageState);
            
            
          }else if(message?.text?.body?.trim().toLowerCase() === "home"){
            await markAsRead(businessPhoneNumberId, messageId);
            await sendHomeMenuFunction(businessPhoneNumberId, user, messageId);
            messageState = "home";  
            setMessageState(user, messageState);
            
          }else if(message?.text?.body?.trim().toLowerCase() === "menu"){
            await markAsRead(businessPhoneNumberId, messageId);
            await sendMainMenuFunction(businessPhoneNumberId, user);
            messageState = "main_menu";
            setMessageState(user, messageState);

          }else{
            const messageData = "Invalid input. Select 'Payment Options'.\n\nType *'Menu'* for main menu or *'Home'* for the Assistant's home menu. "
            await markAsRead(businessPhoneNumberId, messageId);
            await sendMessageFunction(businessPhoneNumberId, user, messageId, messageData);
            await sendOptionsFunction(businessPhoneNumberId, user);
            messageState = "ask_for_payment_phone";
            setMessageState(user, messageState);
          }
        break;
        
        
      case "payment_confirmation":
        if (/^07\d{8}$/.test(message?.text?.body)){
            const paymentPhone = message?.text?.body;
            let text = "";

            setPaymentNumber(user, paymentPhone);
          
          if (userState.subscriptionPackage === "Highway Code" || userState.subscriptionPackage === "Road Signs" || userState.subscriptionPackage === "Questions Bank"){
            text = "Are you sure you want to purchase the *"+userState.subscriptionPackage+".pdf - "+userState.paymentCurrency+" "+userState.paymentAmount+"*?";
          }else{
            text = "Are you sure you want to subscribe to *"+userState.subscriptionPackage+" "+userState.paymentCurrency+"$ "+userState.paymentAmount+"* Zim Provisional Driver's License Whatsapp Assistant? \n\nType *'Menu'* to go back to the Main Menu";
          }
            
            const label1 = "Yes";
            const label2 = "No";
            const buttonId1 = "yes"
            const buttonId2 = "no"
            
            await markAsRead(businessPhoneNumberId, messageId);
            await sendTwoMessageButtonFunction(businessPhoneNumberId, user, text, label1, label2, buttonId1, buttonId2);
            messageState = "payment_execution";
          setMessageState(user, messageState);
          
          
          }else if(message?.text?.body?.trim().toLowerCase() === "home"){
            await markAsRead(businessPhoneNumberId, messageId);
            await sendHomeMenuFunction(businessPhoneNumberId, user, messageId);
            messageState = "home";  
            setMessageState(user, messageState);
           
            
          }else if(message?.text?.body?.trim().toLowerCase() === "menu"){
            await markAsRead(businessPhoneNumberId, messageId);
            await sendMainMenuFunction(businessPhoneNumberId, user);
            messageState = "main_menu";
            setMessageState(user, messageState);

          }else{
            const messageData = "Invalid input. Enter valid *"+userState.paymentOption+"* phone number starting with 0.\n\nType *'Menu'* for main menu or *'Home'* for the Assistant's home menu. "
            await markAsRead(businessPhoneNumberId, messageId);
            await sendMessageFunction(businessPhoneNumberId, user, messageId, messageData);
            messageState = "payment_confirmation";
            setMessageState(user, messageState);
          }
        
        break;
        
      case "payment_execution":
        if (buttonReplyId === "yes"){
         const messageData = "Please enter your Mobile Wallet pin in the following prompt to confirm payment."
         await markAsRead(businessPhoneNumberId, messageId);
         await initiatePayment(businessPhoneNumberId, user, messageId);
          messageState = "payment_execution";
          setMessageState(user, messageState);
          
        }else if(buttonReplyId === "no"){
          await markAsRead(businessPhoneNumberId, messageId);
          await sendOptionsFunction(businessPhoneNumberId, user);
         messageState = "ask_for_payment_phone";
          setMessageState(user, messageState);
          
        }else if(message?.text?.body?.trim().toLowerCase() === "home"){
            await markAsRead(businessPhoneNumberId, messageId);
            await sendHomeMenuFunction(businessPhoneNumberId, user, messageId);
            messageState = "home";  
          setMessageState(user, messageState);
            
          }else if(message?.text?.body?.trim().toLowerCase() === "menu"){
            await markAsRead(businessPhoneNumberId, messageId);
            await sendMainMenuFunction(businessPhoneNumberId, user);
           messageState = "main_menu";
            setMessageState(user, messageState);

          }else{
            const text = "Invalid input. Please select 'Yes' to agree or 'No' to go back to Payment Option selection \n\nType *'Menu'* to go back to the Main Menu";
            const label1 = "Yes";
            const label2 = "No";
            const buttonId1 = "yes"
            const buttonId2 = "no"
            
            await markAsRead(businessPhoneNumberId, messageId);
            await sendTwoMessageButtonFunction(businessPhoneNumberId, user, text, label1, label2, buttonId1, buttonId2);
            messageState = "payment_execution";
            setMessageState(user, messageState);
          }
        break;
    }
  }  
  res.sendStatus(200);
  }
});



connection.getConnection()
  .then(() => {
    console.log('Connected to the database');
  })
  .catch(err => {
    console.error('Database connection failed:', err.message);
  });


app.get("/", (req, res) => {
  res.send(`<pre>Nothing to see here. 
Checkout README.md to start.</pre>`);
});

app.listen(PORT, () => {
  console.log(`Server is listening on port: ${PORT}`);
});
