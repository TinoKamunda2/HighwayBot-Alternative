import {
  userStatesMap,
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


// CALCULATE TIME TAKEN
export async function calculateTimeTaken(user) {
  const userState = userStatesMap.get(user);
  const currentTime = Date.now();
  const timeTakenMs = currentTime - userState.startTime;
  const timeTakenFormatted = `${Math.floor(timeTakenMs / 60000)}m ${Math.floor((timeTakenMs % 60000) / 1000)}s`;

  setTimeTaken(user, timeTakenFormatted);
  setTimeTakenSeconds(user, Math.floor(timeTakenMs / 1000));
  return timeTakenFormatted;
}