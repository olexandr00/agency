// generateAdminHash.js
const bcrypt = require("bcryptjs");

async function hashAdminPassword() {
  const password = "adminpassword"; // БАЖАНИЙ ПАРОЛЬ АДМІНА
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  console.log(`Пароль: ${password}`);
  console.log(`Хеш для SQL: ${hashedPassword}`);
}

hashAdminPassword();
