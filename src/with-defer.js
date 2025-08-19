/**
 * @typedef {Object} DeferOptions
 * @property {number|null} [timeout=null] - Timeout for deferred functions
 * @property {boolean} [debug=false] - Enable debug logging
 * @property {boolean} [throwOnError=false] - Throw error if any deferred function fails
 * @property {function|null} [errorReporter=null] - Function to report errors
 */

/**
 * @typedef {Object} ErrorContext
 * @property {Error} err - The error object
 * @property {number} index - The index of the deferred function
 * @property {string} message - The error message
 */

/**
 * @typedef {Object} Deferred
 * @property {function(): Promise<any>} callback - The deferred callback function
 * @property {number|null} timeout - Timeout for the deferred function
 * @property {string} functionName - The name of the function
 * @property {boolean} isCancelled - Whether the deferred function has been cancelled
 * @property {function(any): void} resolve - Function to resolve the deferred promise
 */

/**
 * @typedef {Object} DeferContext
 * @property {function(function(): Promise<any>, DeferOptions=): {cancel: function(): void, promise: Promise<any>}} defer - Function to defer execution
 * @property {function(function(): Promise<any>): Promise<void>} run - Function to run the main function and deferred functions
 */

/**
 * Creates a wrapper function that allows for deferred execution with error handling
 * @param {function(DeferContext['defer'], ...any[]): Promise<any>} fn - The main function to execute
 * @param {DeferOptions} [options={}] - Global options for deferred functions
 * @returns {function(...any[]): Promise<void>} - A function that runs the provided function with deferred execution
 */
function withDefer(fn, options = {}) {
	if (typeof fn !== "function") {
		throw new TypeError("First argument must be a function");
	}

	if (options !== null && typeof options !== "object") {
		throw new TypeError("Options must be an object or null");
	}
	/**
	 * Creates a deferral context with the provided global options
	 * @param {DeferOptions} [globalOptions={}] - Global options for the deferral context
	 * @returns {DeferContext} - An object with defer and run methods
	 */
	function createDefer(globalOptions = {}) {
		const {
			timeout = null,
			debug = false,
			throwOnError = false,
			errorReporter = null,
		} = globalOptions;

		/** @type {Deferred[]} */
		const deferQueue = [];

		/**
		 * Adds a deferred function to the queue
		 * @param {function(): Promise<any>} callback - The deferred function to be executed later
		 * @param {DeferOptions} [localOptions={}] - Local options for the deferred function
		 * @returns {{cancel: function(): void, promise: Promise<any>}} - An object with a cancel method and a promise for the deferred function
		 */
		function defer(callback, localOptions = {}) {
			if (typeof callback !== "function") {
				throw new TypeError("callback must be a function");
			}

			if (localOptions !== null && typeof localOptions !== "object") {
				throw new TypeError("Options must be an object or null");
			}

			const mergedOptions = { ...globalOptions, ...localOptions };

			// Validate timeout option
			if (
				mergedOptions.timeout !== null &&
				mergedOptions.timeout !== undefined &&
				(typeof mergedOptions.timeout !== "number" ||
					!Number.isFinite(mergedOptions.timeout))
			) {
				throw new TypeError("timeout must be a finite number or null");
			}

			// Validate boolean options
			if (
				typeof mergedOptions.debug !== "undefined" &&
				typeof mergedOptions.debug !== "boolean"
			) {
				throw new TypeError("debug must be a boolean");
			}

			if (
				typeof mergedOptions.throwOnError !== "undefined" &&
				typeof mergedOptions.throwOnError !== "boolean"
			) {
				throw new TypeError("throwOnError must be a boolean");
			}

			// Validate errorReporter option
			if (
				mergedOptions.errorReporter !== null &&
				mergedOptions.errorReporter !== undefined &&
				typeof mergedOptions.errorReporter !== "function"
			) {
				throw new TypeError("errorReporter must be a function or null");
			}

			let resolvePromise;
			const promise = new Promise((resolve) => {
				resolvePromise = resolve;
			});

			const deferred = {
				callback,
				timeout: mergedOptions.timeout ?? null,
				functionName: callback.name || "anonymous",
				isCancelled: false,
				resolve: resolvePromise,
			};

			deferQueue.unshift(deferred);
			return {
				cancel: () => {
					deferred.isCancelled = true;
				},
				promise,
			};
		}

		/**
		 * Runs the main function and the deferred functions
		 * @param {function(): Promise<any>} fn - The main function to execute
		 * @returns {Promise<void>}
		 */
		async function run(fn) {
			try {
				await fn();
			} finally {
				await executeDeferredFunctions();
			}
		}

		/**
		 * Executes all deferred functions in the queue
		 * @returns {Promise<any[]>}
		 */
		async function executeDeferredFunctions() {
			const results = await Promise.allSettled(
				deferQueue.map((deferred, index) => handleDeferred(deferred, index)),
			);

			const errors = handleErrors(
				results.map((r) => (r.status === "fulfilled" ? r.value : r.reason)),
			);
			if (throwOnError && errors.length > 0) {
				throw new AggregateError(
					errors,
					`${errors.length} deferred functions failed`,
				);
			}

			return results;
		}

		/**
		 * Handles the execution of a single deferred function
		 * @param {Deferred} deferred - The deferred function object
		 * @param {number} index - The index of the deferred function in the queue
		 * @returns {Promise<any>}
		 */
		async function handleDeferred(
			{ callback, timeout, functionName, isCancelled, resolve },
			index,
		) {
			if (isCancelled) {
				const result = "deferred function was cancelled";
				resolve(result);
				return result;
			}

			try {
				// Only create timeout promise if timeout is a positive number
				const timeoutPromise =
					timeout && timeout > 0
						? new Promise((_, reject) =>
								setTimeout(
									() => reject(new Error("timeout exceeded")),
									timeout,
								),
							)
						: new Promise(() => {}); // Never resolves

				const result = await Promise.race([callback(), timeoutPromise]);
				resolve(result);
				return result;
			} catch (err) {
				reportError(
					err,
					index,
					err.message === "timeout exceeded"
						? "timed out"
						: "failed to execute",
				);
				resolve(err);
				return err;
			}
		}

		/**
		 * Reports errors with a standard format
		 * @param {Error} err - The error object
		 * @param {number} index - The index of the deferred function
		 * @param {string} action - The action that caused the error
		 */
		function reportError(err, index, action) {
			const { functionName } = deferQueue[index];
			const message = `error in deferred function ${index} (${functionName}): ${action}: ${err.message}`;
			if (debug) {
				console.error(message, err);
			}
			if (errorReporter) {
				errorReporter(err, { err, index, message });
			}
		}

		/**
		 * Handles errors from all deferred functions
		 * @param {any[]} results - The results of deferred functions
		 * @returns {Error[]}
		 */
		function handleErrors(results) {
			return results
				.filter((result) => result instanceof Error)
				.map((err, index) => {
					const { functionName } = deferQueue[index];
					const message = `promise rejection in deferred function ${index} (${functionName})`;
					if (debug) {
						console.error(message, err);
					}
					return new Error(`${message}: ${err.message}`);
				});
		}

		return { defer, run };
	}

	const { defer, run } = createDefer(options);

	return async (...args) => {
		await run(async () => {
			return await fn(defer, ...args);
		});
	};
}

export { withDefer };
