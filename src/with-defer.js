/**
 * @typedef {Object} ErrorContext
 * @property {Error} err - The error object
 * @property {number} index - The index of the deferred function
 * @property {string} message - The error message
 */

/**
 * @typedef {function(Error, ErrorContext): void} ErrorReporter
 */

/**
 * @typedef {Object} DeferOptions
 * @property {number|null} [timeout=null] - Timeout for deferred functions
 * @property {boolean} [debug=false] - Enable debug logging
 * @property {boolean} [throwOnError=false] - Throw error if any deferred function fails
 * @property {ErrorReporter|null} [errorReporter=null] - Function to report errors
 */

/**
 * @typedef {function(): (unknown|Promise<unknown>)} CallbackFunction
 */

/**
 * @typedef {Object} Deferred
 * @property {CallbackFunction} callback - The deferred callback function
 * @property {number|null} timeout - Timeout for the deferred function
 * @property {string} functionName - The name of the function
 * @property {boolean} isCancelled - Whether the deferred function has been cancelled
 * @property {function(unknown): void} resolve - Function to resolve the deferred promise
 * @property {ErrorReporter|null} errorReporter - Per-deferred error reporter function
 * @property {boolean} debug - Whether debug logging is enabled for this deferred
 */

/**
 * @typedef {Object} DeferredResult
 * @property {function(): void} cancel - Function to cancel the deferred execution
 * @property {Promise<unknown>} promise - Promise that resolves when the deferred function completes
 */

/**
 * @typedef {function(CallbackFunction, DeferOptions=): DeferredResult} DeferFunction
 */

/**
 * @typedef {Object} DeferContext
 * @property {DeferFunction} defer - Function to defer execution
 * @property {function(function(): (unknown|Promise<unknown>)): Promise<unknown>} run - Function to run the main function and deferred functions
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
 * Simple deque implementation for efficient prepend operations
 * Provides O(1) prepend and iteration, avoiding array.unshift() O(n) cost
 */
class Deque {
	constructor() {
		this.head = null;
		this.tail = null;
		this.length = 0;
	}

	prepend(item) {
		const node = { value: item, next: this.head };
		this.head = node;
		if (!this.tail) {
			this.tail = node;
		}
		this.length++;
	}

	*[Symbol.iterator]() {
		let current = this.head;
		while (current) {
			yield current.value;
			current = current.next;
		}
	}

	map(callback) {
		const result = [];
		let index = 0;
		for (const item of this) {
			result.push(callback(item, index++));
		}
		return result;
	}
}

/**
 * Validates options object properties
 * @param {DeferOptions} options - Options to validate
 */
function validateDeferOptions(options) {
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
 * @param {Deque|Deferred[]} deferQueue - The queue of deferred functions
 * @param {number} index - The index of the deferred function
 * @param {string} prefix - The message prefix
 * @param {string} [suffix] - Optional message suffix
 * @returns {string} - Formatted error message
 */
function createErrorMessage(deferQueue, index, prefix, suffix = "") {
	let deferred;
	if (Array.isArray(deferQueue)) {
		deferred = deferQueue[index];
	} else {
		let currentIndex = 0;
		for (const item of deferQueue) {
			if (currentIndex === index) {
				deferred = item;
				break;
			}
			currentIndex++;
		}
	}
	const { functionName } = deferred || { functionName: "unknown" };
	const suffixPart = suffix ? `: ${suffix}` : "";
	return `${prefix} in deferred function ${index} (${functionName})${suffixPart}`;
}

/**
 * Reports and logs errors with a standard format
 * @param {Error} err - The error object
 * @param {number} index - The index of the deferred function
 * @param {string} action - The action that caused the error
 * @param {Deque} deferQueue - The queue of deferred functions
 * @param {ErrorReporter|null} errorReporter - Error reporter callback
 * @param {boolean} debug - Whether debug logging is enabled
 */
function reportError(err, index, action, deferQueue, errorReporter, debug) {
	const message = createErrorMessage(
		deferQueue,
		index,
		"error",
		`${action}: ${err instanceof Error ? err.message : String(err)}`,
	);
	if (debug) {
		console.error(message, err);
	}
	if (errorReporter) {
		try {
			errorReporter(err, { err, index, message });
		} catch (reporterErr) {
			if (debug) {
				console.error(
					"Error in errorReporter callback:",
					reporterErr instanceof Error
						? reporterErr.message
						: String(reporterErr),
				);
			}
		}
	}
}

/**
 * Handles the execution of a single deferred function
 * @param {Deferred} deferred - The deferred function object
 * @param {number} index - The index of the deferred function in the queue
 * @param {Deque} deferQueue - The queue of deferred functions for error messaging
 * @returns {Promise<unknown>}
 */
async function handleDeferred(
	{ callback, timeout, isCancelled, resolve, errorReporter, debug },
	index,
	deferQueue,
) {
	if (isCancelled) {
		const result = "deferred function was cancelled";
		resolve(result);
		return result;
	}

	let timeoutId;
	try {
		// Only create timeout promise if timeout is a positive number
		const promises = [callback()];
		if (timeout && timeout > 0) {
			promises.push(
				new Promise((_, reject) => {
					timeoutId = setTimeout(
						() => reject(new Error("timeout exceeded")),
						timeout,
					);
				}),
			);
		}

		const result = await Promise.race(promises);
		// Clear timeout if it was created and callback completed first
		if (timeoutId !== undefined) {
			clearTimeout(timeoutId);
		}
		resolve(result);
		return result;
	} catch (err) {
		// Ensure timeout is cleared even if callback throws
		if (timeoutId !== undefined) {
			clearTimeout(timeoutId);
		}
		const action =
			err instanceof Error && err.message === "timeout exceeded"
				? "timed out"
				: "failed to execute";
		reportError(err, index, action, deferQueue, errorReporter, debug);
		resolve(err);
		return err;
	}
}

/**
 * Creates a wrapper function that allows for deferred execution with error handling
 * @param {function(DeferFunction, ...unknown[]): (unknown|Promise<unknown>)} fn - The main function to execute
 * @param {DeferOptions} [options={}] - Global options for deferred functions
 * @returns {function(...unknown[]): Promise<unknown>} - A function that runs the provided function with deferred execution and returns the main function's return value
 */
function withDefer(fn, options = {}) {
	if (typeof fn !== "function") {
		throw new TypeError("First argument must be a function");
	}

	validateOptionsObject(options, "Options");

	return async (...args) => {
		/**
		 * Creates a deferral context with the provided global options
		 * @param {DeferOptions} [globalOptions={}] - Global options for the deferral context
		 * @returns {DeferContext} - An object with defer and run methods
		 */
		function createDefer(globalOptions = {}) {
			const { debug = false, throwOnError = false } = globalOptions;

			/** @type {Deque} */
			const deferQueue = new Deque();
			let isExecuting = false;

			/**
			 * Adds a deferred function to the queue
			 * @param {function(): Promise<unknown>} callback - The deferred function to be executed later
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

				validateOptionsObject(localOptions, "Options");

				const mergedOptions = { ...globalOptions, ...localOptions };
				validateDeferOptions(mergedOptions);

				let resolvePromise;
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
				};

				deferQueue.prepend(deferred);
				return {
					cancel: () => {
						deferred.isCancelled = true;
					},
					promise,
				};
			}

			/**
			 * Runs the main function and the deferred functions
			 * @param {function(): Promise<unknown>} fn - The main function to execute
			 * @returns {Promise<unknown>} - The return value of the main function
			 */
			async function run(fn) {
				let returnValue;
				try {
					returnValue = await fn();
				} finally {
					await executeDeferredFunctions();
				}
				return returnValue;
			}

			/**
			 * Executes all deferred functions sequentially in LIFO order
			 * @returns {Promise<PromiseSettledResult<unknown>[]>}
			 */
			async function executeDeferredFunctions() {
				isExecuting = true;
				const results = [];
				const deferredArray = Array.from(deferQueue);

				for (let i = 0; i < deferredArray.length; i++) {
					const result = await Promise.allSettled([
						handleDeferred(deferredArray[i], i, deferQueue),
					]);
					results.push(result[0]);
				}

				const errors = handleErrors(
					results.map((r, index) => ({
						result: r.status === "fulfilled" ? r.value : r.reason,
						index,
					})),
					deferQueue,
					debug,
				);

				// Clean up callback references to allow garbage collection
				for (const deferred of deferQueue) {
					deferred.callback = null;
					deferred.resolve = null;
					deferred.errorReporter = null;
				}

				if (throwOnError && errors.length > 0) {
					throw new AggregateError(
						errors,
						`${errors.length} deferred functions failed`,
					);
				}

				return results;
			}

			/**
			 * Handles errors from all deferred functions
			 * @param {{result: unknown, index: number}[]} resultWithIndex - Results with their indices
			 * @param {Deque} deferQueue - The queue of deferred functions
			 * @param {boolean} debug - Whether debug logging is enabled
			 * @returns {Error[]}
			 */
			function handleErrors(resultWithIndex, deferQueue, debug) {
				return resultWithIndex
					.filter(({ result }) => result instanceof Error)
					.map(({ result: err, index }) => {
						const message = createErrorMessage(
							deferQueue,
							index,
							"promise rejection",
						);
						if (debug) {
							console.error(message, err);
						}
						if (err instanceof Error) {
							const wrappedErr = new Error(`${message}: ${err.message}`);
							wrappedErr.cause = err;
							// Preserve original stack trace for debugging
							if (err.stack) {
								wrappedErr.stack = `${wrappedErr.stack}\nCaused by:\n${err.stack}`;
							}
							return wrappedErr;
						}
						return new Error(`${message}: ${String(err)}`);
					});
			}

			return { defer, run };
		}

		const { defer, run } = createDefer(options);

		return run(() => fn(defer, ...args));
	};
}

export { withDefer };
