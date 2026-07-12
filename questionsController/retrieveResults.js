import connection from '../db.js';
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


import {sendMessageFunction} from '../messagesController/sendMessage.js';
import {sendOneMessageButtonFunction, sendThreeMessageButtonFunction} from '../messagesController/sendButtons.js';

// RETRIEVE RESULTS
export async function retrieveResults(businessPhoneNumberId, user, messageId) {
  const userState = userStatesMap.get(user);
  const [rows] = await connection.execute(
    `SELECT question_number, correct_answer, provided_answer, result FROM answers WHERE user_phone = ?`, [user]
  );

  if (!rows.length) return;

  let resultString = 'No.    Answer    Your Answer\n';
  let total_answers = 0;
  let total_correct_answers = 0;

  rows.forEach((row, index) => {
    total_answers++;
    const resultSymbol = row.result === 'correct' ? '✅' : '❌';
    if (row.result === 'correct') total_correct_answers++;
    resultString += `${index + 1}.           ${row.correct_answer}               ${row.provided_answer} ${resultSymbol}\n`;
  });

  const score = (total_correct_answers / userState.questionsLimit) * 100;
  resultString += `\nTotal Answers Provided: ${total_answers}/${userState.questionsLimit} \nTotal Correct Answers: ${total_correct_answers}/${userState.questionsLimit}\nScore: ${score.toFixed(0)}%\nTime Taken: ${userState.timeTaken}`;

  await sendMessageFunction(businessPhoneNumberId, user, messageId, resultString.trim());
  await connection.execute(`DELETE FROM answers WHERE user_phone = ?`, [user]);
  resetUserData(user);
  await sendThreeMessageButtonFunction(businessPhoneNumberId, user, "Proceed to Practice Exercises or Exit to Main Menu", "Practice Exercises", "Timed Practice Test", "🔁 Retry Failed Qtns", "tests", "timed_test", "failed_questions");
}
