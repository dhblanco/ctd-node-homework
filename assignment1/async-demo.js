const fs = require("fs");
const path = require("path");

// 1. Callback style
const sampleFilesDir = path.join(__dirname, "sample-files");
const samplePath = path.join(sampleFilesDir, "sample.txt");

fs.mkdirSync(sampleFilesDir, { recursive: true });

fs.writeFile(samplePath, "Hello, async world!", "utf8", (err) => {
  if (err) {
    console.error("Error writing file:", err);
    return;
  }
  fs.readFile(samplePath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading:", err);
      return;
    }
    console.log("Callback: " + data);
  });
});

// Callback hell example (test and leave it in comments):
/* Successfully tested!
fs.writeFile(samplePath, "Hello, async world!", "utf8", (err) => {
  if (err) {
    console.error("Error writing file: ", err);
    return;
  }

  fs.readFile(samplePath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading file: ", err);
      return;
    }

    fs.writeFile("sample-files/butFirst.txt", data, "utf8", (err) => {
      if (err) {
        console.error("Error writing file: ", err);
        return;
      }

      fs.readFile("sample-files/butFirst.txt", "utf8", (err, copy) => {
        if (err) {
          console.error("Error reading file: ", err);
          return;
        }
        console.log(copy + " vCallbackHell");
      });
    });
  });
});
*/

// 2. Promise style
const { promisify } = require("node:util");
const readFile = promisify(fs.readFile);

readFile(samplePath, "utf8")
  .then((content) => {
    console.log("Promise: " + content);
  })
  .catch((err) => {
    console.error("Unable to read file: ", err.message);
  });

// 3. Async/Await style

async function promiseRead() {
  try {
    const content = await readFile(samplePath, "utf8");
    console.log("Async/await: " + content);
  } catch (err) {
    console.error("Unable to read file: ", err.message);
  }
}
promiseRead();
