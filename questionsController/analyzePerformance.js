
import connection from "../db.js";
import OpenAI from "openai";
import { markAsRead } from '../messagesController/markAsRead.js';
import { sendMessageFunction } from '../messagesController/sendMessage.js';
import { sendOneMessageButtonFunction } from '../messagesController/sendButtons.js';

const token = process.env["GITHUB_TOKEN"];
const endpoint = "https://models.github.ai/inference";
const model = "openai/gpt-4o-mini";

export async function analyzeUserPerformance(user, businessPhoneNumberId, messageId) {
  try {
  const today = new Date().toISOString().split('T')[0];

  const [userResult] = await connection.execute(
  `SELECT performance_logs FROM users WHERE phone = ?`,
  [user]
    );

    let logEntry = userResult[0]?.performance_logs || "";
    let [logDate, logCount] = logEntry.split(":");

    const MAX_DAILY_ANALYSIS = 3;
    logCount = parseInt(logCount || "0");

    if (logDate === today && logCount >= MAX_DAILY_ANALYSIS) {
      const label = "Main Menu";
      const buttonId = "main_menu";
      const text = "⚠️ You have exceeded your performance analysis limit for the day. You can only analyze performance 3 times per day.";

      await markAsRead(businessPhoneNumberId, messageId);
      await sendOneMessageButtonFunction(businessPhoneNumberId, user, text, label, buttonId);
      console.log("Performance Analysis not sent. User reached daily limit:", user);
      return;
    }

    let newCount = (logDate === today) ? logCount + 1 : 1;
    const remaining = MAX_DAILY_ANALYSIS - newCount;
    const newLog = `${today}:${newCount}`;



    await sendMessageFunction(
      businessPhoneNumberId,
      user,
      messageId,
      `🔍 Please wait while we analyze your performance... \n\n(Daily Performance Analyses left today: ${remaining})`
    );


  const [performanceData] = await connection.execute(
    `SELECT * FROM performance WHERE user_phone = ? ORDER BY test_number DESC`,
    [user]
  );

  if (performanceData.length === 0) {
    await sendMessageFunction(
      businessPhoneNumberId,
      user,
      messageId,
      "No performance data available."
    );
    return;
  }

  let totalTests = 0;
  let totalQuestions = 0;
  let totalCorrect = 0;
  let totalTimeSec = 0;
  let timedTests = [];

  const questionTypeStats = {
    road_sign_qtn_mark: { correct: 0, total: 0 },
    traffic_intersection_qtn_mark: { correct: 0, total: 0 },
    theory_qtn_mark: { correct: 0, total: 0 }
  };

  for (const test of performanceData) {
    totalTests++;
    totalQuestions += test.no_questions_taken;
    totalCorrect += test.no_correct_answers;

    for (const type of Object.keys(questionTypeStats)) {
  const value = typeof test[type] === "string" ? test[type] : "0/0";
  const parts = value.split("/");
  const correct = parseInt(parts[0], 10);
  const total = parseInt(parts[1], 10);

  questionTypeStats[type].correct += isNaN(correct) ? 0 : correct;
  questionTypeStats[type].total += isNaN(total) ? 0 : total;
}

    if (test.status === "complete" && test.time_taken) {
      timedTests.push(test);
      totalTimeSec += parseInt(test.time_taken);
    }
  }

  const avgTimeSec = timedTests.length ? totalTimeSec / timedTests.length : 0;
  const avgMins = Math.floor(avgTimeSec / 60);
  const avgSecs = Math.round(avgTimeSec % 60);
  const avgTimeTaken = `⏳ ${avgMins} minutes ${avgSecs} seconds`;
  const passRate = totalQuestions > 0 ? ((totalCorrect / totalQuestions) * 100).toFixed(1) : "0.0";
  const overallRating = passRate >= 92 ? "✅Pass" : "❌Fail";

  const recentTimed = timedTests.slice(0, 5).map(t => {
    const scorePercent = ((t.no_correct_answers / t.no_questions_taken) * 100).toFixed(1);
    const result = scorePercent >= 92 ? "✅Pass" : "❌Fail";
    const mins = Math.floor(t.time_taken / 60);
    const secs = t.time_taken % 60;
    return `Test ${t.test_number} | ⏳ ${mins}m ${secs}s, Score: ${scorePercent}%, ${result}`;
  });

  const questionTypeEntries = Object.entries(questionTypeStats).map(([type, data]) => ({
    type,
    correct: data.correct,
    total: data.total,
    percent: data.total ? ((data.correct / data.total) * 100).toFixed(1) : "0.0"
  }));

  const sortedAreas = [...questionTypeEntries].sort((a, b) => a.percent - b.percent);
  const worstAreas = sortedAreas.slice(0, 2);
  const bestAreas = sortedAreas.slice(-2).reverse();

  const readableType = {
    road_sign_qtn_mark: "Road Signs",
    traffic_intersection_qtn_mark: "Traffic Intersections",
    theory_qtn_mark: "Theory"
  };

  const compactData = `
*Overall Performance*
No. of tests completed : ${totalTests}
Total attempted questions : ${totalQuestions}
Total correct answers : ${totalCorrect}/${totalQuestions}
Pass rate : ${passRate}% ${overallRating}
Average test completion time: ${avgTimeTaken}

*Timed Test Performance History*
${recentTimed.join("\n")}

*Worst & Best Test Performance Areas*
1. Worst
${worstAreas.map(a => `${readableType[a.type]} : ${a.correct} correct out of ${a.total} - ${a.percent}%`).join("\n")}

2. Best 
${bestAreas.map(a => `${readableType[a.type]} : ${a.correct} correct out of ${a.total} - ${a.percent}%`).join("\n")}
`;

  console.log(compactData);
    
    const prompt = `
Analyze the following provisional driving license test performance data & give a very helpful report:
This data is from a Whatsapp Chatbot called Zim Provisional Driver's License Whatsapp Assistant designed to help people get ready to ace their Learner's Driver's License test.

${compactData}

The report should be formatted as follows:

*Your Performance Progress Report*
*Overal Perfomace*
No of tests completed : XXX 
Total attempted questions : XXX 
Total correct answers : XXX/XXX 
Pass rate : XXX% <ratting (✅Pass/❌Fail)> 
Average test completion time taken: ⏳ XXX minutes XXX seconds

*Timed Test Performance History* 
Test <No> | ⏳ <time taken>, Score: XXX%, <ratting (✅Pass/❌Fail)> 

*Worst & Best Test Performance Areas*
    1. Worst
        <question_type> : XXX correct out of XXX total number of attempts - XXX%
    2. Best 
        <question_type> : XXX correct out of XXX total number of attempts - XXX%
            
*Areas & Suggestions for Improvement*
<question_type> : (comment and suggestion)

*Recommended Practice Strategies*
//list your recommended strategies. Always state the Zim Provisional Driver's Whatsapp Assistant as the only study tool

*Performance Progress Summary*
(analyze the performance trend and summarize progress and readiness)
    
- please note that pass is 92% or 23/25 and above.
- Always refer all recommendations to this Zim Provisional Driver's License Whatsapp Chatbot
- include icons
- please do not add more *s or #s apart from the ones in format
`;

    
    
    const client = new OpenAI({ baseURL: endpoint, apiKey: token });

    const response = await client.chat.completions.create({
    messages: [
        { role:"system", content: "You are an expert driving test instructor that responds short and precisely." },
        { role:"user", content: prompt }
      ],
      temperature: 1.0,
      top_p: 1.0,
      model: model
    });

    const messageData = response.choices[0].message.content;
    const label = "Main Menu";
    const buttonId = "main_menu";
    const text = "Select Main Menu to return to the main menu.";

    await markAsRead(businessPhoneNumberId, messageId);
    await sendMessageFunction(businessPhoneNumberId, user, messageId, messageData);
    await sendOneMessageButtonFunction(businessPhoneNumberId, user, text, label, buttonId);
    
    await connection.execute(
      `UPDATE users SET performance_logs = ? WHERE phone = ?`,
      [newLog, user]
    );
    
    console.log("Performance Analysis sent to user:", user);
  } catch (error) {
    console.error("Error analyzing performance:", error.message);
    await sendMessageFunction(businessPhoneNumberId, user, messageId, "Something went wrong while analyzing your performance. Try again.");
  }
}



