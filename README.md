# `with-defer.js`

[![npm version](https://img.shields.io/npm/v/@dacodedbeat/with-defer-js.svg)](https://www.npmjs.com/package/@dacodedbeat/with-defer-js)
[![License: MPL 2.0](https://img.shields.io/badge/License-MPL_2.0-brightgreen.svg)](https://opensource.org/licenses/MPL-2.0)
[![Formatted with Biome](https://img.shields.io/badge/Formatted_with-Biome-60a5fa?style=flat&logo=biome)](https://biomejs.dev/)

**`with-defer.js`** is a simple and lightweight JavaScript library that allows you to schedule function callbacks after the execution of a function, just like Golang’s `defer`. Perfect for cleanup tasks, error handling, and more for both asynchronous and synchronous operations.

## Why `with-defer.js`?

Inspired by Golang’s `defer`, this library gives you the same power in JavaScript.

In Go, `defer` lets you schedule a function to run after the current function ends - whether it finishes normally or with an error. This is useful for tasks like closing files or releasing resources without messing up the main flow of the program.

In JavaScript, especially with async operations, you often need similar cleanup tasks, but there's no built-in `defer` keyword. This library brings the simplicity of Go's defer to JavaScript.

TL;DR: Stack up tasks, run them after your main code finishes (even if it crashes), and keep your code tidy.

### Golang vs. `with-defer.js`

#### Golang:
```go
func main() {
    defer cleanup1()
    defer cleanup2()
    // do stuff
}
```

#### `with-defer.js`:
```javascript
import { withDefer } from 'with-defer';

const mainFunction = (defer) => {
    defer(() => console.log("Cleanup 1"));
    defer(() => console.log("Cleanup 2"));
    // do stuff
};

withDefer(mainFunction)();
```

#### How the two align
1. **Automatic Execution After Function Ends:** Just like in Go, functions in `with-defer.js` run after the main function finishes, whether it succeeds or fails. This makes sure cleanup tasks are done.

2. **Last-In, First-Out Execution:** Deferred functions in both Go and `with-defer.js` run in reverse/LIFO(Last-In, First-Out) order, meaning the last function added runs first. This helps with cleaning up resources in the correct order.

3. **User-Friendly API:** The `defer()` in `with-defer.js` is similar to Go’s, making it easy to use for scheduling functions in JavaScript.

Same vibe, right?

## Features

- Stack up deferred functions to run after your main code.
- Set timeouts and cancel deferred tasks.
- Built-in error reporting with optional error throwing.
- Optional debug mode for the curious souls.

## Install

```bash
npm install with-defer
```

## Usage

Wrap your function with `withDefer` and use `defer` to schedule tasks.

```javascript
import { withDefer } from 'with-defer';

const mainFunction = async (defer) => {
    defer(() => console.log('Deferred task!'), { timeout: 5000 });

    console.log('Doing main stuff!');
};

withDefer(mainFunction)();
```

### Options

> [!IMPORTANT]
> When implementing, please verify this with the your installed version of the source code, as this is can change over time.

Set options when you wrap your function, as well as on each deferred callback:

| Option          | Type      | Default  | Description                                                               |
|-----------------|-----------|----------|---------------------------------------------------------------------------|
| `timeout`       | `number`  | `null`   | Max time (ms) for deferred functions.                                      |
| `debug`         | `boolean` | `false`  | Debug mode.                                                               |
| `throwOnError`  | `boolean` | `false`  | Throw error if a deferred function fails.                                  |
| `errorReporter` | `function`| `null`   | Custom error handler for deferred functions.                               |

## Error Handling & Debugging

- Use `throwOnError` to fail hard if a deferred function crashes.
- Use `errorReporter` for custom error handling.
- Enable `debug` to get logs.

## Cancel a Deferred Task

```javascript
const { cancel } = defer(() => console.log('This won’t run if canceled.'));
cancel();
```

## Contributing
If you’d like to contribute to `with-defer.js`, we welcome your input! Please read our [Contributing Guidelines](https://github.com/DAcodedBEAT/with-defer-js/blob/main/CONTRIBUTING.md) to get started.

## License
`with-defer.js` is licensed under the Mozilla Public License 2.0. See the [`LICENSE`](https://github.com/DAcodedBEAT/with-defer-js/blob/main/LICENSE) file for more details.
