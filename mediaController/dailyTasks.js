import cron from 'node-cron';
import connection from '../db.js';

// Schedule task to run at midnight (00:00) every day
cron.schedule('0 0 * * *', async () => {
  try {
    await connection.execute('DELETE FROM performance_analysis_logs');
    console.log('✅ Daily cleanup of performance_analysis_logs completed.');
  } catch (error) {
    console.error('❌ Error cleaning performance_analysis_logs:', error.message);
  }
});
