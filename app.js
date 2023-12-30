require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const bodyParser = require("body-parser");
const { getTimeLeft } = require("./Controller/TimeController");

const TOKEN = process.env.TOKEN;
const WEBHOOKURL = process.env.WEBHOOKURL;

const app = express();

app.use(bodyParser.json());

const bot = new TelegramBot(TOKEN, { polling: false });

bot.setWebHook(`${WEBHOOKURL}/bot${TOKEN}`);

const botUsername = "@Giveaway_new_bot";

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.post(`/bot${TOKEN}`, (req, res) => {
  const body = req.body;
  bot.processUpdate(body);
  res.sendStatus(200);
});

const port = 4040;
app.listen(port, () => {
  console.log("Server runing at" + port);
});

// Dictionary to store user data during the conversation
const user_data = [];

// Dictionary to store active giveaways
const active_giveaways = {};

// Define the states for the conversation
let states = "";

const textOpt = {
  parse_mode: "Markdown",
};

// Command to start the conversation
bot.onText(/\/startgiveaway/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const chatMember = await bot.getChatMember(chatId, userId);

  // Check if the user has administrative privileges
  if (
    chatMember.status === "administrator" ||
    chatMember.status === "creator"
  ) {
    if (!user_data[chatId]) {
      bot.sendMessage(
        chatId,
        "*✨🎉🌟 Greetings, Giveaway Enthusiast! 🌟🎉✨*\n\nReady to embark on a new giveaway adventure? 🚀\nTell me, what's the title of this exciting event? 🎁",
        textOpt
      );
      user_data[chatId] = { title: "", winners: 0, duration: 0 };
      states = "title";
    }
  } else {
    bot.sendMessage(
      chatId,
      "🚫 You are not authorized to use this command. ❌"
    );
  }
});

bot.onText(new RegExp(botUsername), (message) => {
  if (message.text == undefined) {
    return;
  }

  const botUsername = "@Giveaway_new_bot";
  if (!message.text.includes(botUsername)) {
    return;
  }

  if (message.text.charAt(0) != "/" && user_data[message.chat.id]) {
    console.log(message.text);
    const chatId = message.chat.id;
    if (user_data[chatId]) {
      switch (states) {
        case "title":
          user_data[chatId].title = message.text;
          bot.sendMessage(
            chatId,
            `*✨🌟 Great news! 🌟✨*\nThe title is set to: ${user_data[chatId].title}.\nHow many winners will there be? 🏆`,
            textOpt
          );
          states = "winners";
          break;
        case "winners":
          user_data[chatId].winners = parseInt(message.text);
          if (
            !isNaN(user_data[chatId].winners) &&
            user_data[chatId].winners > 0
          ) {
            bot.sendMessage(
              chatId,
              `*🎉✨ Awesome! ${user_data[chatId].winners} winners. ✨🎉*\nNow, what will be the duration of the giveaway by hours? ⏰`,
              textOpt
            );
            states = "duration";
          } else {
            bot.sendMessage(
              chatId,
              "*⚠️🙅‍♂️ Please enter a valid number greater than 0 for the number of winners. 🏆*",
              textOpt
            );
          }
          break;
        case "duration":
          user_data[chatId].duration = parseFloat(message.text);
          if (
            !isNaN(user_data[chatId].duration) &&
            user_data[chatId].duration > 0
          ) {
            // ----
            const inlineKeyboard = {
              inline_keyboard: [
                [{ text: "Start Giveaway", callback_data: "startGiveaway" }],
              ],
            };
            const endTime =
              Date.now() + user_data[chatId].duration * 60 * 60 * 1000; // Convert hours to milliseconds
            active_giveaways[chatId] = {
              title: user_data[chatId].title,
              winners: user_data[chatId].winners,
              endTime,
              participants: [],
            };

            bot.sendMessage(
              chatId,
              `*✨🎉 Perfect! The giveaway will run for ${getTimeLeft(
                endTime
              )}. 🕒*\nYou've successfully set up the giveaway. If you have any more commands, feel free to ask! 🚀`,
              { ...textOpt, reply_markup: JSON.stringify(inlineKeyboard) }
            );

            states = "done";
          } else {
            bot.sendMessage(
              chatId,
              "*⚠️🙅‍♂️ Please enter a valid number greater than 0 for the number of hours. 🏆*",
              textOpt
            );
          }
          break;
      }
    }
  }
});

bot.on("callback_query", (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  const userId = callbackQuery.from.id;

  if (data === "startGiveaway") {
    const inlineKeyboard = {
      inline_keyboard: [
        [{ text: "Enter Giveaway", callback_data: "enterGiveaway" }],
      ],
    };

    bot.sendMessage(
      chatId,
      "*🚀 The giveaway has started! 🍀 Good luck to all participants! *  \n\n_Click the button below to enter!_ 🚀 \n\nPowered by: @habibihideout ",
      { ...textOpt, reply_markup: JSON.stringify(inlineKeyboard) }
    );

    // // Set a timeout to notify users when the giveaway ends
    // setTimeout(() => {
    //   bot.sendMessage(
    //     chatId,
    //     `*🎉 GIVEAWAY ENDED 🎉* \n\nTitle: ${active_giveaways[chatId].title
    //     } \nWinners: ${active_giveaways[chatId].winners
    //     } \nEnds in: 0 Seconds ${getTimeLeft(
    //       active_giveaways[chatId].endTime
    //     )}  \nEntries: ${Object.keys(active_giveaways[chatId].participants).length
    //     } \n\nPowered by: @habibihideout`,
    //     textOpt
    //   );
    //   delete active_giveaways[chatId];
    //   delete user_data[chatId];
    // }, user_data[chatId].duration * 60 * 60 * 1000);
    // Set a timeout to notify users when the giveaway ends
    setTimeout(() => {
      const giveawayData = active_giveaways[chatId];

      // Check if there are participants
      if (Object.keys(giveawayData.participants).length > 0) {
        const winnersCount = giveawayData.winners;
        const participantsKeys = Object.keys(giveawayData.participants);
        const randomWinners = [];

        while (
          randomWinners.length < winnersCount &&
          participantsKeys.length > 0
        ) {
          const randomIndex = Math.floor(
            Math.random() * participantsKeys.length
          );
          const winnerId = participantsKeys.splice(randomIndex, 1)[0];
          const winnerName = giveawayData.participants[winnerId].username;
          randomWinners.push(winnerName);
        }

        // Display winners
        let winnersMessage = "🏆 **Winners of the Giveaway** 🏆\n\n";
        randomWinners.forEach((winner, index) => {
          winnersMessage += `🥇 Winner ${index + 1}: ${winner}\n`;
        });

        bot.sendMessage(
          chatId,
          `*🎉 GIVEAWAY ENDED 🎉* \n\nTitle: ${giveawayData.title}\nWinners: ${
            active_giveaways[chatId].winners
          } \nEnds in: 0 Seconds ${getTimeLeft(
            giveawayData.endTime
          )}  \nEntries: ${Object.keys(giveawayData.participants).length}
          \n\n${winnersMessage}\n\nPowered by: @habibihideout`,
          textOpt
        );
      } else {
        // Notify that there are no winners if no participants
        bot.sendMessage(
          chatId,
          `*🎉 GIVEAWAY ENDED 🎉* \n\nTitle: ${
            giveawayData.title
          } \nNo winners (No participants) \nEnds in: 0 Seconds ${getTimeLeft(
            giveawayData.endTime
          )}  \nEntries: 0 \n\nPowered by: @habibihideout`,
          textOpt
        );
      }

      // Clean up giveaway data
      delete active_giveaways[chatId];
      delete user_data[chatId];
    }, user_data[chatId].duration * 60 * 60 * 1000);
  }

  if (data === "enterGiveaway") {
    // Check if the user is already a participant
    if (!active_giveaways[chatId].participants[userId]) {
      const fullName = `${callbackQuery.from.first_name} ${
        callbackQuery.from.last_name || ""
      }`;
      active_giveaways[chatId].participants[userId] = { username: fullName };
      bot.sendMessage(
        chatId,
        `🎉 ${fullName} You have entered the giveaway! 🍀 Good luck! `
      );
    } else {
      bot.sendMessage(chatId, "🙅‍♂️ You are already in the giveaway. 🎁");
    }
  }
});

// Command handler for /currentgiveaway
bot.onText(/\/currentgiveaway/, (msg) => {
  const chatId = msg.chat.id;

  // Check if there is an active giveaway
  if (active_giveaways[chatId]) {
    const timeLeft = getTimeLeft(active_giveaways[chatId].endTime);
    const message = `
    🎉 *Current Giveaway Details* 🎉 \n\nTitle: ${
      active_giveaways[chatId].title
    } \nWinners: ${
      active_giveaways[chatId].winners
    } \nTime Left: ${timeLeft} \nEntries: ${
      Object.keys(active_giveaways[chatId].participants).length
    } \n\n_Click the button below to enter!_ 🚀 \n\nPowered by: @habibihideout `;

    // Create an inline keyboard with an "Enter Giveaway" button
    const inlineKeyboard = {
      inline_keyboard: [
        [{ text: "Enter Giveaway", callback_data: "enterGiveaway" }],
      ],
    };

    bot.sendMessage(chatId, message, {
      parse_mode: "Markdown",
      reply_markup: JSON.stringify(inlineKeyboard),
    });
  } else {
    bot.sendMessage(chatId, "🚫 There is no active giveaway at the moment. 🕰️");
  }
});

// Command handler for /participants
bot.onText(/\/participants/, (msg) => {
  const chatId = msg.chat.id;

  if (active_giveaways[chatId]) {
    const participantNames = Object.values(
      active_giveaways[chatId].participants
    ).map((participant) => participant.username);
    if (participantNames.length > 0) {
      bot.sendMessage(
        chatId,
        `🎉 Participants in the Giveaway: \n${participantNames.join("\n ")}`
      );
    } else {
      bot.sendMessage(chatId, "🙅‍♂️ No participants in the giveaway yet.");
    }
  } else {
    bot.sendMessage(
      chatId,
      "🚫 There is no active giveaway at the moment. 🕰️    "
    );
  }
});

bot.onText(/\/helpgiveaway/, (msg) => {
  const chatId = msg.chat.id;
  //const helpMessage ="🤖 *Bot Commands:* 🤖 \n\n1. */currentgiveaway* - Display details about the current giveaway.\n2. */entergiveaway** - Enter the current giveaway.\n3. */participants* - Show the list of participants in the current giveaway.\n4. */help* - Display this help message.\n5. */start* - Start a new giveaway. Follow the instructions to set it up.\n6. */cancel* - Cancel the setup of the current giveaway.\n\n🎉 *Giveaway Commands:* 🎉\n\n- To start a new giveaway, use the /start command and follow the instructions.\n\nNote: Replace placeholders such as [Your Title], [Number of Winners], etc., with the actual details for your giveaway.\n\nFeel free to explore and enjoy the giveaway experience! 🌟";

  bot.sendMessage(
    chatId,
    "🤖 *Bot Commands:* 🤖 \n\n1. */currentgiveaway* - Display details about the current giveaway.\n2. */entergiveaway* - Enter the current giveaway.\n3. */participants* - Show the list of participants in the current giveaway.\n4. */helpgiveaway* - Display this help message.\n5. */startgiveaway* - Start a new giveaway.\n6. */cancelgiveaway* - Cancel the setup of the current giveaway.\n\n🎉 *Giveaway Commands:* 🎉\n\n- To start a new giveaway, use the /startgiveaway command and follow the instructions.\n\nNote: Replace placeholders such as [Your Title], [Number of Winners], etc., with the actual details for your giveaway.\n\nFeel free to explore and enjoy the giveaway experience! 🌟\n\nPowered by: @habibihideout",
    textOpt
  );
});

// Handle /cancel command to cancel the setup
bot.onText(/\/cancelgiveaway/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const chatMember = await bot.getChatMember(chatId, userId);

  // Check if the user has administrative privileges
  if (
    chatMember.status === "administrator" ||
    chatMember.status === "creator"
  ) {
    if (user_data[chatId]) {
      bot.sendMessage(chatId, "*❌ The setup has been canceled. ❌*", textOpt);
      delete user_data[chatId];
      delete active_giveaways[chatId];
    }
  } else {
    bot.sendMessage(
      chatId,
      "🚫 You are not authorized to use this command. ❌"
    );
  }
});
