const { userSchema } = require("../validation/userSchema");
const crypto = require("crypto");
const util = require("util");
const scrypt = util.promisify(crypto.scrypt);

async function register(req, res) {
  if (!req.body) req.body = {};

  const { error, value } = userSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    return res.status(400).json({
      message: `Error registering user: ${error.message}`,
    });
  }

  const userIndex = global.users.findIndex(
    (user) => user.email === value.email,
  );

  if (userIndex !== -1) {
    return res.status(409).json({
      message: "User already exists",
    });
  }

  const hashedPassword = await hashPassword(value.password);
  const newUser = { 
    name: value.name, 
    email: value.email, 
    hashedPassword };
  global.user_id = newUser;
  global.users = [...global.users, newUser];
  
  res.status(201).json({
    name: newUser.name,
    email: newUser.email,
  });
}

async function logon(req, res) {
  const { email, password } = req.body;
  const user = global.users.find((user) => user.email === email);
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  const goodCredentials =
    user && await comparePassword(password, user.hashedPassword);

  if (!goodCredentials) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  global.user_id = user;
  res.status(200).json({
    name: user.name,
    email: user.email,
  });
}

function logoff(req, res) {
  global.user_id = null;
  res.status(200).json({ message: "Logged out successfully" });
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);

  return `${salt}:${derivedKey.toString("hex")}`;
}

async function comparePassword(inputPassword, storedHash) {
  const [salt, key] = storedHash.split(":");
  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = await scrypt(inputPassword, salt, 64);

  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

module.exports = {
  register,
  logon,
  logoff,
};
