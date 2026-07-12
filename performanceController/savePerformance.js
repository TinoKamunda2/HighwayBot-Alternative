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



// SAVE PERFORMANCE
 export async function savePerformance(user) {
   const userState = userStatesMap.get(user);
  const category = userState.category;
  const [testRows] = await connection.execute(
    `SELECT COALESCE(MAX(test_number), 0) AS last_test_number FROM performance WHERE user_phone = ? AND category = ?`, [user, category]
  );
  const nextTestNumber = testRows[0].last_test_number + 1;
  const status = (userState.testCompletionState === "test_complete") ? "complete" : "incomplete";

  const [questionsTaken] = await connection.execute(
    `SELECT COUNT(*) AS total_questions FROM answers WHERE user_phone = ?;`, [user]
  );
  const no_questions_taken = questionsTaken[0].total_questions;

  const [correctAnswers] = await connection.execute(
    `SELECT COUNT(*) AS correct_answers FROM answers WHERE user_phone = ? AND result = 'correct';`, [user]
  );
  const no_correct_answers = correctAnswers[0].correct_answers;

  const getQuestionMark = async (type) => {
    const [rows] = await connection.execute(
      `SELECT COUNT(*) AS total, SUM(CASE WHEN result = 'correct' THEN 1 ELSE 0 END) AS correct FROM answers WHERE user_phone = ? AND question_type = ?`, [user, type]
    );
    return `${rows[0].correct || 0}/${rows[0].total || 0}`;
  };

  const road_sign_qtn_mark = await getQuestionMark("road_sign");
  const traffic_intersection_qtn_mark = await getQuestionMark("traffic_intersection");
  const theory_qtn_mark = await getQuestionMark("theory");

  const time_taken = category === "timed_test" && status === "complete" ? userState.timeTakenSeconds : null;

  await connection.execute(
    `INSERT INTO performance (
      test_number, status, category, no_correct_answers, no_questions_taken,
      road_sign_qtn_mark, traffic_intersection_qtn_mark, theory_qtn_mark, time_taken, user_phone
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nextTestNumber, status, category, no_correct_answers, no_questions_taken,
      road_sign_qtn_mark, traffic_intersection_qtn_mark, theory_qtn_mark, time_taken ?? null, user
    ]
  );
   console.log(`Performance stats saved for user: ${user} for Test# ${nextTestNumber}` );
}
