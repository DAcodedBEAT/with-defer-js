/**
 * @typedef {Object} ErrorContext
 * @property {unknown} err - The error object
 * @property {number} index - The index of the deferred function
 * @property {string} message - The error message
 */

/**
 * @typedef {function(unknown, ErrorContext): void} ErrorReporter
 */

/**
 * @typedef {Object} DeferOptions
 * @property {number|null} [timeout=null] - Timeout for deferred functions
 * @property {boolean} [debug=false] - Enable debug logging
 * @property {boolean} [throwOnError=false] - Throw error if any deferred function fails
 * @property {ErrorReporter|null} [errorReporter=null] - Function to report errors
 */

/**
 * @typedef {Object} RunContext
 * @property {boolean} hasError - Whether the main function is currently pending with an error (false once recovered)
 * @property {unknown} error - The main function's pending error, meaningful only when hasError is true
 * @property {unknown} value - The main function's pending return value, meaningful only when hasError is false
 * @property {function(unknown): void} recover - Suppresses the pending error (if any) and sets the final return value,
 *   mirroring Go's `recover()` + named-return mutation. Reflects the current state right before each deferred runs, so
 *   a later (earlier-registered) deferred sees whatever an earlier (later-registered) one already recovered/set.
 */

/**
 * @typedef {function(RunContext=): (unknown|Promise<unknown>)} CallbackFunction
 */

/**
 * @typedef {Object} Deferred
 * @property {CallbackFunction|null} callback - The deferred callback function (nulled out after execution for GC)
 * @property {number|null} timeout - Timeout for the deferred function
 * @property {string} functionName - The name of the function
 * @property {boolean} isCancelled - Whether the deferred function has been cancelled
 * @property {(function(unknown): void)|null} resolve - Function to resolve the deferred promise (nulled out after execution for GC)
 * @property {ErrorReporter|null} errorReporter - Per-deferred error reporter function
 * @property {boolean} debug - Whether debug logging is enabled for this deferred
 * @property {boolean} throwOnError - Whether a failure of this deferred should be included in the thrown AggregateError
 */

/**
 * @typedef {Object} DeferredResult
 * @property {function(): void} cancel - Function to cancel the deferred execution
 * @property {Promise<unknown>} promise - Promise that resolves when the deferred function completes
 */

/**
 * @typedef {(callback: CallbackFunction, localOptions?: DeferOptions) => DeferredResult} DeferFunction
 */

/**
 * Validates that a value is an object or null
 * @param {unknown} value - Value to validate
 * @param {string} name - Name of the parameter for error messages
 */
function validateOptionsObject(value, name) {
	if (value !== null && typeof value !== "object") {
		throw new TypeError(`${name} must be an object or null`);
	}
}

/**
 * Validates that a value is a boolean if defined
 * @param {unknown} value - Value to validate
 * @param {string} name - Name of the parameter for error messages
 */
function validateBoolean(value, name) {
	if (typeof value !== "undefined" && typeof value !== "boolean") {
		throw new TypeError(`${name} must be a boolean`);
	}
}

/**
 * @param {unknown} err
 * @returns {string}
 */
function getErrorMessage(err) {
	return err instanceof Error ? err.message : String(err);
}

/**
 * @type {ReadonlySet<string>}
 */
const KNOWN_DEFER_OPTION_KEYS = new Set(["timeout", "debug", "throwOnError", "errorReporter"]);

/**
 * Rejects options objects containing keys outside the documented option set (e.g. typos)
 * @param {unknown} options - Options to check
 * @param {string} name - Name of the parameter for error messages
 */
function validateKnownKeys(options, name) {
	if (options === null || options === undefined) {
		return;
	}
	for (const key of Object.keys(options)) {
		if (!KNOWN_DEFER_OPTION_KEYS.has(key)) {
			throw new TypeError(`Unknown ${name} property: "${key}"`);
		}
	}
}

/**
 * Validates that an options argument is a well-shaped options object: an object or null,
 * and containing only known keys. Doesn't validate individual option values - callers do
 * that themselves via validateDeferOptions, once they have the (possibly merged) object
 * whose values actually apply.
 * @param {unknown} options - Options to check
 * @param {string} name - Name of the parameter for error messages
 */
function validateOptionsShape(options, name) {
	validateOptionsObject(options, name);
	validateKnownKeys(options, name);
}

/**
 * Validates options object properties
 * @param {DeferOptions|null|undefined} options - Options to validate
 */
function validateDeferOptions(options) {
	if (options === null || options === undefined) {
		return;
	}
	if (
		options.timeout !== null &&
		options.timeout !== undefined &&
		(typeof options.timeout !== "number" || !Number.isFinite(options.timeout))
	) {
		throw new TypeError("timeout must be a finite number or null");
	}

	validateBoolean(options.debug, "debug");
	validateBoolean(options.throwOnError, "throwOnError");

	if (
		options.errorReporter !== null &&
		options.errorReporter !== undefined &&
		typeof options.errorReporter !== "function"
	) {
		throw new TypeError("errorReporter must be a function or null");
	}
}

/**
 * Creates a formatted error message for deferred functions
 * @param {string} functionName - The name of the deferred function
 * @param {number} index - The index of the deferred function
 * @param {string} prefix - The message prefix
 * @param {string} [suffix] - Optional message suffix
 * @returns {string} - Formatted error message
 */
function createErrorMessage(functionName, index, prefix, suffix = "") {
	const suffixPart = suffix ? `: ${suffix}` : "";
	return `${prefix} in deferred function ${index} (${functionName})${suffixPart}`;
}

/**
 * Reports and logs errors with a standard format
 * @param {unknown} err - The error object
 * @param {number} index - The index of the deferred function
 * @param {string} action - The action that caused the error
 * @param {string} functionName - The name of the deferred function
 * @param {ErrorReporter|null} errorReporter - Error reporter callback
 * @param {boolean} debug - Whether debug logging is enabled
 * @returns {Promise<void>}
 */
async function reportError(err, index, action, functionName, errorReporter, debug) {
	const message = createErrorMessage(
		functionName,
		index,
		"error",
		`${action}: ${getErrorMessage(err)}`,
	);
	if (debug) {
		console.error(message, err);
	}
	if (errorReporter) {
		try {
			await errorReporter(err, { err, index, message });
		} catch (reporterErr) {
			if (debug) {
				console.error("Error in errorReporter callback:", getErrorMessage(reporterErr));
			}
		}
	}
}

/**
 * @typedef {{ok: true, value: unknown}|{ok: false, error: unknown}} DeferredOutcome
 */

/**
 * @typedef {{hasError: boolean, error: unknown, value: unknown}} RunOutcome
 */

/**
 * Builds the RunContext handed to a deferred callback, reflecting the current (possibly
 * already-recovered-by-an-earlier-deferred) state of the main function's outcome.
 * @param {RunOutcome} runOutcome - The shared, mutable outcome of the main function
 * @param {{settled: boolean}} ticket - Flips to settled once this deferred's own
 *   handleDeferred call has settled (via timeout, completion, or cancellation), so a
 *   callback that keeps running detached after losing its timeout race can no longer
 *   mutate runOutcome out from under later deferreds or the already-finished run().
 * @returns {RunContext}
 */
function createRunContext(runOutcome, ticket) {
	return {
		hasError: runOutcome.hasError,
		error: runOutcome.error,
		value: runOutcome.value,
		recover(newValue) {
			if (ticket.settled) {
				return;
			}
			runOutcome.hasError = false;
			runOutcome.error = undefined;
			runOutcome.value = newValue;
		},
	};
}

/**
 * Handles the execution of a single deferred function
 * @param {Deferred} deferred - The deferred function object
 * @param {number} index - The index of the deferred function in the queue
 * @param {RunOutcome} runOutcome - The shared, mutable outcome of the main function
 * @returns {Promise<DeferredOutcome>}
 */
async function handleDeferred(
	{ callback, timeout, isCancelled, resolve, errorReporter, debug, functionName },
	index,
	runOutcome,
) {
	// callback/resolve are only ever null after this deferred has already run once (GC cleanup);
	// handleDeferred is never invoked twice for the same deferred, so they're non-null here.
	const invoke = /** @type {CallbackFunction} */ (callback);
	const settle = /** @type {function(unknown): void} */ (resolve);

	if (isCancelled) {
		const result = "deferred function was cancelled";
		settle(result);
		return { ok: true, value: result };
	}

	// See createRunContext: guards against a callback that keeps running (e.g. past a lost
	// timeout race) from mutating runOutcome after this deferred has already settled.
	const ticket = { settled: false };

	let timeoutId;
	try {
		const promises = [invoke(createRunContext(runOutcome, ticket))];
		if (timeout != null && timeout > 0) {
			promises.push(
				new Promise((_, reject) => {
					timeoutId = setTimeout(() => reject(new Error("timeout exceeded")), timeout);
				}),
			);
		}

		const result = await Promise.race(promises);
		ticket.settled = true;
		// Clear timeout if it was created and callback completed first
		if (timeoutId !== undefined) {
			clearTimeout(timeoutId);
		}
		settle(result);
		return { ok: true, value: result };
	} catch (err) {
		ticket.settled = true;
		// Ensure timeout is cleared even if callback throws
		if (timeoutId !== undefined) {
			clearTimeout(timeoutId);
		}
		const action =
			err instanceof Error && err.message === "timeout exceeded"
				? "timed out"
				: "failed to execute";
		await reportError(err, index, action, functionName, errorReporter, debug);
		settle(err);
		return { ok: false, error: err };
	}
}

/**
 * Creates a wrapper function that allows for deferred execution with error handling
 * @param {(defer: DeferFunction, ...args: unknown[]) => (unknown|Promise<unknown>)} fn - The main function to execute
 * @param {DeferOptions} [options={}] - Global options for deferred functions
 * @returns {(...args: unknown[]) => Promise<unknown>} - A function that runs the provided function with deferred execution and returns the main function's return value
 */
function withDefer(fn, options = {}) {
	if (typeof fn !== "function") {
		throw new TypeError("First argument must be a function");
	}

	validateOptionsShape(options, "Options");
	validateDeferOptions(options);

	return async (...args) => {
		/**
		 * Creates a deferral context with the provided global options
		 * @param {DeferOptions} [globalOptions={}] - Global options for the deferral context
		 * @returns {{defer: DeferFunction, run: function(function(): (unknown|Promise<unknown>)): Promise<unknown>}}
		 */
		function createDefer(globalOptions = {}) {
			/** @type {Deferred[]} */
			const deferQueue = [];
			let isExecuting = false;

			/**
			 * Adds a deferred function to the queue
			 * @param {CallbackFunction} callback - The deferred function to be executed later
			 * @param {DeferOptions} [localOptions={}] - Local options for the deferred function
			 * @returns {{cancel: function(): void, promise: Promise<unknown>}} - An object with a cancel method and a promise for the deferred function
			 */
			function defer(callback, localOptions = {}) {
				if (isExecuting) {
					throw new Error(
						"Cannot call defer() during deferred function execution. Defer must be called before the main function completes.",
					);
				}

				if (typeof callback !== "function") {
					throw new TypeError("callback must be a function");
				}

				validateOptionsShape(localOptions, "Options");

				const mergedOptions = { ...globalOptions, ...localOptions };
				validateDeferOptions(mergedOptions);

				/** @type {(arg0: unknown) => void} */
				let resolvePromise = () => {};
				const promise = new Promise((resolve) => {
					resolvePromise = resolve;
				});

				/** @var {Deferred} deferred */
				const deferred = {
					callback,
					timeout: mergedOptions.timeout ?? null,
					functionName: callback.name || "anonymous",
					isCancelled: false,
					resolve: resolvePromise,
					errorReporter: mergedOptions.errorReporter ?? null,
					debug: mergedOptions.debug ?? false,
					throwOnError: mergedOptions.throwOnError ?? false,
				};

				// Push (append) + LIFO iteration below, instead of a linked-list prepend,
				// since a plain array already gives O(1) append and O(n) reverse iteration.
				deferQueue.push(deferred);
				return {
					cancel: () => {
						deferred.isCancelled = true;
					},
					promise,
				};
			}

			/**
			 * Runs the main function and the deferred functions
			 * @param {function(): (unknown|Promise<unknown>)} fn - The main function to execute
			 * @returns {Promise<unknown>} - The (possibly deferred-recovered/overridden) return value of the main function
			 */
			async function run(fn) {
				/** @type {RunOutcome} */
				const runOutcome = { hasError: false, error: undefined, value: undefined };
				try {
					runOutcome.value = await fn();
				} catch (err) {
					runOutcome.hasError = true;
					runOutcome.error = err;
				}

				await executeDeferredFunctions(runOutcome);

				if (runOutcome.hasError) {
					throw runOutcome.error;
				}
				return runOutcome.value;
			}

			/**
			 * Executes all deferred functions sequentially in LIFO order
			 * @param {RunOutcome} runOutcome - The main function's outcome; deferreds may inspect/recover it via RunContext
			 * @returns {Promise<void>}
			 */
			async function executeDeferredFunctions(runOutcome) {
				isExecuting = true;
				// Materialize LIFO order once (O(n)) instead of re-deriving deferred
				// metadata per error later, which previously made failure reporting O(n^2).
				const lifoQueue = deferQueue.slice().reverse();
				const outcomes = [];

				for (let i = 0; i < lifoQueue.length; i++) {
					outcomes.push(await handleDeferred(lifoQueue[i], i, runOutcome));
				}

				const errors = collectThrowableErrors(outcomes, lifoQueue);

				// Clean up callback references to allow garbage collection
				for (const deferred of lifoQueue) {
					deferred.callback = null;
					deferred.resolve = null;
					deferred.errorReporter = null;
				}

				if (errors.length > 0) {
					throw new AggregateError(errors, `${errors.length} deferred functions failed`);
				}
			}

			/**
			 * Wraps failed outcomes whose own deferred opted into throwOnError
			 * @param {DeferredOutcome[]} outcomes - Outcomes in the same order as lifoQueue
			 * @param {Deferred[]} lifoQueue - Deferreds in LIFO (execution) order
			 * @returns {Error[]}
			 */
			function collectThrowableErrors(outcomes, lifoQueue) {
				/** @type {Error[]} */
				const errors = [];
				for (let index = 0; index < outcomes.length; index++) {
					const outcome = outcomes[index];
					if (outcome.ok || !lifoQueue[index].throwOnError) {
						continue;
					}
					const err = outcome.error;
					const message = createErrorMessage(
						lifoQueue[index].functionName,
						index,
						"promise rejection",
					);
					if (err instanceof Error) {
						const wrappedErr = new Error(`${message}: ${err.message}`);
						wrappedErr.cause = err;
						// Preserve original stack trace for debugging
						if (err.stack) {
							wrappedErr.stack = `${wrappedErr.stack}\nCaused by:\n${err.stack}`;
						}
						errors.push(wrappedErr);
					} else {
						errors.push(new Error(`${message}: ${String(err)}`));
					}
				}
				return errors;
			}

			return { defer, run };
		}

		const { defer, run } = createDefer(options);

		return run(() => fn(defer, ...args));
	};
}

export { withDefer };
