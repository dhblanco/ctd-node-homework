const { userSchema } = require("../validation/userSchema");
const crypto = require("crypto");
const util = require("util");
const scrypt = util.promisify(crypto.scrypt);
const prisma = require("../db/prisma");
const DUMMY_HASH = "a20733bcc58fa971f535b282c090c3b0:e36e245b52fcfb07a92c9e23496649de574d1f846f51a57de15c7ffcfb155197fcbe152073195286c3619631da4d486e39ba25ed87a5fba6db3b2e5bd4aa8dcd";

async function register(req, res, next) {
  if (!req.body) req.body = {};

  const { error, value } = userSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    return res.status(400).json({
      message: "Validation failed",
      details: error.details,
    });
  }

  value.hashedPassword = await hashPassword(value.password);
  delete value.password;

  let user = null;

  try {
    user = await prisma.user.create({
      data: { 
        name: value.name, 
        email: value.email, 
        hashedPassword: value.hashedPassword,
      },
      select: { name: true, email: true, id: true }, // specify the column values to return
    });
  } catch (err) {
    if (err.name === "PrismaClientKnownRequestError" && err.code === "P2002") {
      return res.status(400).json({
        message: "Email already registered",
      });
    }

    return next(err);
  }

  global.user_id = user.id;

  res.status(201).json({
    name: user.name,
    email: user.email,
  });
}

async function logon(req, res) {
  let { email, password } = req.body;
  email = email.toLowerCase();

  const user = await prisma.user.findUnique({ where: { email } });

  const storedHash = user ? user.hashedPassword : DUMMY_HASH;

  const goodCredentials = await comparePassword(password, storedHash);  // reduce timing difference 

  if (!user || !goodCredentials) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  global.user_id = user.id;

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
