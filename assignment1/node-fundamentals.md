# Node.js Fundamentals

## What is Node.js?
Node.js is a runtime environment for running JavaScript outside the browser. It also provides access to other APIs, including filesystem access and environment variables, etc.

## How does Node.js differ from running JavaScript in the browser?
JavaScript is the language; whereas the browser and Node provide different built-in APIs. So for example, browsers can access DOM or cookies, and Node.js can access system-level features, like processes and servers.

## What is the V8 engine, and how does Node use it?
The V8 engine is a high-performance js engine created by google for chrome that compiles and runs js very quickly, which Node.js then wraps extra abilities around in order to access files and networks/servers.

## What are some key use cases for Node.js?
Start a web server, read/write files, use backend libraries, and real-time apps like chat

## Explain the difference between CommonJS and ES Modules. Give a code example of each.

**CommonJS (default in Node.js):**
```js
const fs = require("fs");
```

**ES Modules (supported in modern Node.js):**
```js
import { useState } from "react";
``` 