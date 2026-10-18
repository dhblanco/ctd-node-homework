const os = require("os");
const path = require("path");
const fs = require("fs");

const sampleFilesDir = path.join(__dirname, "sample-files");
if (!fs.existsSync(sampleFilesDir)) {
  fs.mkdirSync(sampleFilesDir, { recursive: true });
}

// OS module
const platform = os.platform();
console.log("Platform: " + platform);

const cpuInfo = os.cpus();
console.log("CPU: " + cpuInfo[0].model);

const mem = os.totalmem();
console.log("Total Memory: " + mem);

// Path module
const joinedPath = path.join(
  __dirname,
  "sample-files",
  "folder",
  "file.txt"
);
console.log("Joined path: " + joinedPath);

// fs.promises API
const fsPromise = require("node:fs/promises");
const promisePath = path.join(sampleFilesDir, "demo.txt");

async function writeAndReadPromise() {
  try {
    await fsPromise.writeFile(
      promisePath, 
      "Hello from fs.promises!", 
      "utf8");

    const content = await fsPromise.readFile(promisePath, "utf8");

    console.log("fs.promises read: " + content);
  } catch (err) {
    console.error("File operation failed:", err.message);
  }
};

writeAndReadPromise();

// Streams for large files- log first 40 chars of each chunk
