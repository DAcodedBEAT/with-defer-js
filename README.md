# `with-defer.js`

[![npm version](https://img.shields.io/npm/v/@dacodedbeat/with-defer-js.svg)](https://www.npmjs.com/package/@dacodedbeat/with-defer-js)
[![License: MPL 2.0](https://img.shields.io/badge/License-MPL_2.0-brightgreen.svg)](https://opensource.org/licenses/MPL-2.0)
[![Formatted with oxfmt](https://img.shields.io/badge/Formatted_with-oxfmt-orange?style=flat)](https://oxc.rs/docs/guide/usage/formatter)

**`with-defer.js`** is a simple and lightweight JavaScript library that allows you to schedule function callbacks after
the execution of a function, just like Golang’s `defer`. Perfect for cleanup tasks, error handling, and more for both
asynchronous and synchronous operations.

## Why `with-defer.js`?

Inspired by Golang’s `defer`, this library gives you the same power in JavaScript.

In Go, `defer` lets you schedule a function to run after the current function ends - whether it finishes normally or
with an error. This is useful for tasks like closing files or releasing resources without messing up the main flow of
the program.

In JavaScript, especially with async operations, you often need similar cleanup tasks, but there's no built-in `defer`
keyword. This library brings the simplicity of Go's defer to JavaScript.

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
import { withDefer } from "@dacodedbeat/with-defer-js";

const mainFunction = (defer) => {
	defer(() => console.log("Cleanup 1"));
	defer(() => console.log("Cleanup 2"));
	// do stuff
};

withDefer(mainFunction)();
```

#### How the two align

1. **Automatic Execution After Function Ends:** Just like in Go, functions in `with-defer.js` run after the main
   function finishes, whether it succeeds or fails. This makes sure cleanup tasks are done.

2. **Last-In, First-Out Execution:** Deferred functions in both Go and `with-defer.js` run in reverse/LIFO(Last-In,
   First-Out) order, meaning the last function added runs first. This helps with cleaning up resources in the correct
   order.

3. **User-Friendly API:** The `defer()` in `with-defer.js` is similar to Go’s, making it easy to use for scheduling
   functions in JavaScript.

4. **`recover()` + named-return mutation:** Just like Go's `recover()` inside a deferred function can stop a panic and
   set the function's named return value, a deferred callback here can inspect the main function's pending
   error/return value via a `RunContext` argument and call `ctx.recover(value)` to suppress the error and/or change
   what `withDefer()` ultimately resolves with. See [Recovering from errors](#recovering-from-errors--named-return-mutation) below.

Same vibe, right?

#### A note on argument evaluation timing

One place Go and `with-defer.js` genuinely differ: Go's `defer f(x)` evaluates `x` **immediately** at the `defer`
line — only the call itself is delayed. A JS closure captures variables live, so `defer(() => f(x))` reads `x`'s
value at _execution_ time, which matters if `x` changes afterward:

```javascript
let x = 1;
defer(() => console.log(x)); // logs 2, not 1 - x is read when the deferred runs
x = 2;
```

To snapshot a value the way Go does, capture it into its own binding at `defer()`-call time:

```javascript
const snapshotX = x;
defer(() => console.log(snapshotX)); // logs 1, exactly like Go
```

## Features

- Stack up deferred functions to run after your main code.
- Set timeouts and cancel deferred tasks.
- Built-in error reporting with optional error throwing.
- Optional debug mode for the curious souls.
- Full TypeScript support with complete type definitions.
- Production ready with comprehensive input validation.
- Well tested with extensive edge case coverage.

## Install

### npm

```bash
npm install @dacodedbeat/with-defer-js
```

### Deno

```bash
import { withDefer } from 'npm:@dacodedbeat/with-defer-js';
```

### Bun

```bash
bun add @dacodedbeat/with-defer-js
```

Ships as both ESM and CommonJS — `import` gets the ESM source directly; `require()` gets a generated CJS build
(`dist/cjs/with-defer.js`, produced by `npm run build`). Both expose the same API.

## Usage

Wrap your function with `withDefer` and use `defer` to schedule tasks.

```javascript
import { withDefer } from "@dacodedbeat/with-defer-js";

const mainFunction = async (defer) => {
	defer(() => console.log("Deferred task!"), { timeout: 5000 });

	console.log("Doing main stuff!");
};

withDefer(mainFunction)();
```

### TypeScript Usage

```typescript
import { withDefer, type DeferFunction } from "@dacodedbeat/with-defer-js";

const mainFunction = async (defer: DeferFunction) => {
	defer(() => console.log("Cleanup complete!"));

	// Your main logic here
	return "Success!";
};

await withDefer(mainFunction)();
```

### Options

> [!IMPORTANT]
> When implementing, please verify this with the your installed version of the source code, as this is can change over
> time.

Set options when you wrap your function, as well as on each deferred callback:

| Option          | Type       | Default | Description                                  |
| --------------- | ---------- | ------- | -------------------------------------------- |
| `timeout`       | `number`   | `null`  | Max time (ms) for deferred functions.        |
| `debug`         | `boolean`  | `false` | Debug mode.                                  |
| `throwOnError`  | `boolean`  | `false` | Throw error if a deferred function fails.    |
| `errorReporter` | `function` | `null`  | Custom error handler for deferred functions. |

## Error Handling & Debugging

- Use `throwOnError` to fail hard if a deferred function crashes.
- Use `errorReporter` for custom error handling.
- Enable `debug` to get logs.

## Cancel a Deferred Task

```javascript
const { cancel } = defer(() => console.log('This won't run if canceled.'));
cancel();
```

## Execution Guarantees

### Return Value Capture

Your main function's return value is captured and available when `withDefer()` resolves:

```javascript
const example = withDefer(async (defer) => {
	defer(() => console.log("cleanup"));
	return { userId: 123 };
});

const result = await example();
// result === { userId: 123 }
// Cleanup has already executed
```

### Execution Order

Deferreds execute in **LIFO (Last-In-First-Out)** order, matching Go's defer semantics:

```javascript
const example = withDefer(async (defer) => {
	defer(() => console.log("3. First registered"));
	defer(() => console.log("2. Second registered"));
	defer(() => console.log("1. Third registered"));
});

await example();
// Output:
// 1. Third registered
// 2. Second registered
// 3. First registered
```

### Recovering from Errors & Named-Return Mutation

Every deferred callback optionally receives a `RunContext` argument reflecting the main function's pending outcome —
mirroring Go's `recover()` (which can stop a panic) and named-return mutation (which can change what the function
returns), both in one mechanism:

```typescript
type RunContext = {
	hasError: boolean; // true if the main function threw/rejected and hasn't been recovered yet
	error: unknown; // the pending error, meaningful only when hasError is true
	value: unknown; // the pending return value, meaningful only when hasError is false
	recover: (newValue: unknown) => void; // suppress the error (if any) and set the final return value
};
```

**Recovering a thrown error** (like Go's `defer func() { if r := recover(); r != nil { ... } }()`):

```javascript
const example = withDefer(async (defer) => {
	defer((ctx) => {
		if (ctx.hasError) {
			console.error("recovered from:", ctx.error);
			ctx.recover("fallback value");
		}
	});

	throw new Error("boom");
});

await example(); // resolves "fallback value" instead of rejecting
```

**Mutating the return value on success** (like Go's named-return mutation):

```javascript
const example = withDefer(async (defer) => {
	defer((ctx) => {
		ctx.recover(ctx.value + 1);
	});

	return 1;
});

await example(); // resolves 2
```

Deferreds run LIFO, so `ctx` always reflects whatever the most-recently-executed (i.e. earlier-registered) deferred
already did — the last deferred to call `recover()` wins, matching Go's semantics where an outer deferred's
`recover()`/return-mutation is the one that's actually observed by the caller. Callbacks that don't declare the `ctx`
parameter are unaffected — this is fully backward compatible.

> [!IMPORTANT]
>
> - **Call `recover()` synchronously within your callback, before it settles.** Once a deferred's own callback has
>   settled — including a callback that lost its `timeout` race but keeps running in the background afterward — any
>   later `recover()` call from it is a no-op. `recover()` is for the deferred that's currently running to decide the
>   outcome, not for a stale, already-finished (or abandoned) one to reach back and change it.
> - **A deferred's own failure and `recover()` are independent.** `recover()` only affects what `run()` itself
>   resolves/rejects with. If that same deferred (or any other) also throws and has `throwOnError: true`, the
>   resulting `AggregateError` is still thrown — a successful `recover()` does not suppress a separately-reported
>   deferred failure. Without `throwOnError`, the deferred's own error is just reported via `errorReporter`/`debug` as
>   usual, and the `recover()` call's effect on the final value still stands.

### Error Handling

When errors occur in deferred functions:

1. Debug logging (if enabled)
2. Error reporter callback (if provided)
3. Error aggregation and optional throwing

Errors don't mutate original error objects; use `.cause` property to access the original error:

```javascript
try {
	await example();
} catch (aggErr) {
	if (aggErr instanceof AggregateError) {
		const wrappedErr = aggErr.errors[0];
		const originalErr = wrappedErr.cause; // Original error preserved
	}
}
```

> [!IMPORTANT]
> The `promise` returned by `defer()` **always resolves**, even when the deferred callback throws, times out, or is
> cancelled — it never rejects. On failure it resolves with the raw error value (check with `instanceof Error`); on
> cancellation it resolves with the string `"deferred function was cancelled"`. Use `throwOnError` and/or
> `errorReporter` at the `withDefer()`/`defer()` level to be notified of failures — don't rely on `.catch()` on an
> individual deferred's `promise`.

### Timeout Precision

Timeouts are implemented with `setTimeout()`, which has platform-dependent precision:

- **Node.js:** ±1-5ms typical
- **Browser:** ±1-10ms typical
- **Electron:** ±5-15ms typical

Timeouts are properly cleaned up after completion and never fire before the specified interval.

> [!IMPORTANT]
> A timeout only stops **waiting** for the callback — it does not abort or cancel the callback itself. If a timed-out
> deferred callback is still running (e.g. an in-flight `await`), it keeps executing in the background after the
> timeout is reported, and its eventual result/rejection is discarded. There is no `AbortSignal` passed into deferred
> callbacks today; if your cleanup needs real cancellation, wire your own `AbortController` through the callback.

### Important Limitation: Fire-and-Forget Async Operations

If a deferred callback returns a promise that rejects **after** the deferred execution phase completes, the rejection is not caught:

```javascript
// ❌ BAD: Unhandled promise rejection
defer(() => {
	setTimeout(() => Promise.reject(new Error("late error")), 100);
});

// ✅ GOOD: Await all async operations
defer(async () => {
	await fetch("/cleanup");
});

// ✅ GOOD: Explicitly handle unhandled rejections
defer(() => {
	fetch("/cleanup").catch((err) => console.error("failed:", err));
});
```

### Concurrency

Multiple `withDefer()` calls are independent and don't interfere with each other:

```javascript
const [result1, result2] = await Promise.all([
	withDefer(async (defer) => {
		defer(() => db.close());
		return "db cleaned";
	})(),
	withDefer(async (defer) => {
		defer(() => server.close());
		return "server cleaned";
	})(),
]);
// Both execute in parallel, independently
```

## Breaking Changes (v0.0.3)

This release makes `with-defer.js` truly concurrent-safe and Go-compatible:

- **Isolated defer stacks per invocation:** Each call to `withDefer(fn)()` now gets its own independent defer queue, preventing interference between concurrent calls
- **Sequential LIFO execution:** Deferreds now execute sequentially in LIFO order instead of concurrently, matching Go's semantics
- **No nested defer calls:** Calling `defer()` during deferred execution now throws an error instead of silently failing

**Migration:** If your code relied on concurrent deferred execution, you'll need to adjust expectations. Deferreds now execute strictly in order, one at a time, in LIFO (Last-In-First-Out) order - just like Go.

## Contributing

If you'd like to contribute to `with-defer.js`, we welcome your input! Please read
our [Contributing Guidelines](https://github.com/DAcodedBEAT/with-defer-js/blob/main/CONTRIBUTING.md) to get started.

## License

`with-defer.js` is licensed under the Mozilla Public License 2.0. See the [
`LICENSE`](https://github.com/DAcodedBEAT/with-defer-js/blob/main/LICENSE) file for more details.
