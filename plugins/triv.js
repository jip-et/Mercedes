const axios = require('axios');
const { cmd } = require('../command');

cmd({
  pattern: 'quiz',
  alias: ['q'],
  desc: 'Fetches a quiz question from an API and presents it to the user.',
  category: 'fun',
  use: '.quiz',
  filename: __filename,
}, async (conn, mek, msg, { from, sender, args, reply }) => {
  try {
    // Fetch a quiz question from the API
    const response = await axios.get('https://the-trivia-api.com/v2/questions?limit=1');
    const questionData = response.data[0];

    if (!questionData) {
      return reply('❌ Failed to fetch a quiz question. Please try again later.');
    }

    const { question, correctAnswer, incorrectAnswers } = questionData;
    const options = [...incorrectAnswers, correctAnswer];
    shuffleArray(options);

    // Send the question and options to the user
    const optionsText = options.map((option, index) => `${String.fromCharCode(65 + index)}. ${option}`).join('\n');
    await reply(`🎯 *Question:* ${question.text}\n\n${optionsText}\n\nYou have 20 seconds to answer. Reply with the letter corresponding to your choice.`);

    // Store the correct answer for this user/chat
    const quizData = {
      correctAnswer,
      options,
      timestamp: Date.now()
    };

    // Create a message collector manually
    let answered = false;
    const messageHandler = async (message) => {
      if (answered) return;
      
      const msg = message.messages[0];
      if (!msg || !msg.message) return;
      
      const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
      const userJid = msg.key.participant || msg.key.remoteJid;
      
      // Check if it's from the same user in the same chat
      if (userJid === sender && msg.key.remoteJid === from) {
        const userAnswer = text.trim().toUpperCase();
        
        if (/^[A-D]$/.test(userAnswer)) {
          answered = true;
          conn.ev.off('messages.upsert', messageHandler);
          
          const isCorrect = options[userAnswer.charCodeAt(0) - 65] === correctAnswer;
          
          if (isCorrect) {
            await conn.sendMessage(from, { text: '✅ Correct! Well done! 🎉' }, { quoted: msg });
          } else {
            await conn.sendMessage(from, { text: `❌ Incorrect. The correct answer was: ${correctAnswer}` }, { quoted: msg });
          }
        }
      }
    };

    // Listen for messages
    conn.ev.on('messages.upsert', messageHandler);

    // Set timeout to remove listener after 20 seconds
    setTimeout(() => {
      if (!answered) {
        conn.ev.off('messages.upsert', messageHandler);
        conn.sendMessage(from, { text: `⏰ Time's up! The correct answer was: ${correctAnswer}` });
      }
    }, 20000);

  } catch (error) {
    console.error('Error fetching quiz data:', error);
    reply('❌ Failed to fetch quiz data. Please try again later.');
  }
});

// Shuffle an array in place
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
          }
