//userStateManager.js

import connection from "./db.js";

// Use a Map for better in-memory state management
export let userStatesMap = new Map();

// Helper function to initialize user state
export const initializeUserState = (user) => {
  if (!userStatesMap.has(user)) {
    userStatesMap.set(user, {
      messageState: null,
      testCompletionState: null,
      category: null,
      answersCount: null,
      questionsLimit: null,
      correctAnswer: null,
      questionType: null,
      explanation: null,
      questionNumber: 0,
      questionId: 0,
      totalQuestionsNumber: 0,
      incrementedQuestionNumber: 0,
      timeLimit: null,
      startTime: null,
      timeTaken: null,
      timeTakenSeconds: 0,
      timerId: null,
      expiration: null,
      paymentOption: null,
      paymentNumber: null,
      paymentAmount: null,
      paymentCurrency: null,
      subscriptionPackage: null,
      askedQuestions: new Set(),
    });
  }
};

// Function to set the user message state manually
export const setMessageState = (user, newMessageState) => {
  initializeUserState(user);
  userStatesMap.get(user).messageState = newMessageState;
  console.log(`Message State for user ${user}: ${newMessageState}`);
};

// Function to set the Test Completion state manually
export const setTestCompletionState = (user, newTestCompletionState) => {
  initializeUserState(user);
  userStatesMap.get(user).testCompletionState = newTestCompletionState;
  console.log(`Test Completion State for user ${user} set to: ${newTestCompletionState}`);
};

// Function to set the category
export const setCategory = (user, newCategory) => {
  initializeUserState(user);
  userStatesMap.get(user).category = newCategory;
  console.log(`Category set to: ${newCategory}`);
};

// Function to set the answers count
export const setAnswersCount = (user, count) => {
  initializeUserState(user);
  userStatesMap.get(user).answersCount = count;
  console.log(`Answers count set to: ${count}`);
};

// Function to set the questions limit
export const setQuestionsLimit = (user, limit) => {
  initializeUserState(user);
  userStatesMap.get(user).questionsLimit = limit;
  console.log(`Questions limit set to: ${limit}`);
};

// Function to set the correct answer
export const setCorrectAnswer = (user, correctAnswer) => {
  initializeUserState(user);
  userStatesMap.get(user).correctAnswer = correctAnswer;
  console.log(`Correct answer set to: ${correctAnswer}`);
};

// Function to set the question type
export const setQuestionType = (user, questionType) => {
  initializeUserState(user);
  userStatesMap.get(user).questionType = questionType;
  console.log(`Question type set to: ${questionType}`);
};

// Function to set the question ID
export const setQuestionId = (user, questionId) => {
  initializeUserState(user);
  userStatesMap.get(user).questionId = questionId;
  console.log(`Question ID set to: ${questionId}`);
};

// Function to set the explanation
export const setExplanation = (user, explanation) => {
  initializeUserState(user);
  userStatesMap.get(user).explanation = explanation;
  console.log(`Explanation set to: ${explanation}`);
};

// Function to set the question number
export const setQuestionNumber = (user, number) => {
  initializeUserState(user);
  userStatesMap.get(user).questionNumber = number;
  console.log(`Question number set to: ${number}`);
};

// Function to set the incremented question number manually
export const setIncrementedQuestionNumber = (user, number) => {
  initializeUserState(user);
  userStatesMap.get(user).incrementedQuestionNumber = number;
  console.log(`Incremented Question number set to: ${number}`);
};

// Function to set total  question number manually
export const setTotalQuestionsNumber = (user, totalQuestionsNumber) => {
  initializeUserState(user);
  userStatesMap.get(user).totalQuestionsNumber = totalQuestionsNumber;
  console.log(`Total Questions number set to: ${totalQuestionsNumber}`);
};

// Function to increment question number
export const incrementQuestionNumber = (user) => {
  initializeUserState(user);
  const userState = userStatesMap.get(user);
  userState.questionNumber += 1;
  userState.incrementedQuestionNumber = userState.questionNumber;
  console.log(`Question number incremented to: ${userState.incrementedQuestionNumber}`);
};

// Function to set the time limit and record start time
export const setTimeLimit = (user, timeLimit) => {
  initializeUserState(user);
  const userState = userStatesMap.get(user);
  userState.timeLimit = timeLimit;
  userState.startTime = new Date().getTime();
  console.log(`Time limit set to: ${timeLimit} mins, start time recorded`);
};

// Function to set time taken
export const setTimeTaken = (user, timeTaken) => {
  initializeUserState(user);
  userStatesMap.get(user).timeTaken = timeTaken;
  console.log(`Time taken set to: ${timeTaken}`);
};

// Function to set time taken in seconds
export const setTimeTakenSeconds = (user, seconds) => {
  initializeUserState(user);
  userStatesMap.get(user).timeTakenSeconds = seconds;
  console.log(`Time taken in seconds set to: ${seconds}`);
};

// Function to set expiration
export const setExpiration = (user, expiration) => {
  initializeUserState(user);
  userStatesMap.get(user).expiration = expiration;
  console.log(`Expiration set to: ${expiration}`);
};

// Function to set the payment option
export const setPaymentOption = (user, option) => {
  initializeUserState(user);
  userStatesMap.get(user).paymentOption = option;
  console.log(`Payment option set to: ${option}`);
};

// Function to set payment number
export const setPaymentNumber = (user, number) => {
  initializeUserState(user);
  userStatesMap.get(user).paymentNumber = number;
  console.log(`Payment number set to: ${number}`);
};

// Function to set payment amount
export const setPaymentAmount = (user, amount) => {
  initializeUserState(user);
  userStatesMap.get(user).paymentAmount = amount;
  console.log(`Payment amount set to: ${amount}`);
};

// Function to set payment currency
export const setPaymentCurrency = (user, currency) => {
  initializeUserState(user);
  userStatesMap.get(user).paymentCurrency = currency;
  console.log(`Payment currency set to: ${currency}`);
};

// Function to set subscription package
export const setSubscriptionPackage = (user, pkg) => {
  initializeUserState(user);
  userStatesMap.get(user).subscriptionPackage = pkg;
  console.log(`Subscription package set to: ${pkg}`);
};

// Function to set asked questions (override)
export const setAskedQuestions = (user, questionsSet) => {
  initializeUserState(user);
  userStatesMap.get(user).askedQuestions = new Set(questionsSet);
  console.log(`Asked questions updated`);
};

// Function to reset user data
export const resetUserData = (user) => {
  if (userStatesMap.has(user)) {
    const userState = userStatesMap.get(user);
    if (userState.timerId) {
      clearTimeout(userState.timerId);
      console.log(`Timer cleared for user ${user}`);
    }

    userStatesMap.delete(user);
    connection.execute('DELETE FROM answers WHERE user_phone = ?', [user]);
    console.log(`User data for ${user} has been reset`);
  }
};