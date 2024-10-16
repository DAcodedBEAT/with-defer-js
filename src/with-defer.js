/**
 * @typedef {Object} deferOptions
 * @property {number|null} [timeout=null] - timeout for deferred functions
 * @property {boolean} [debug=false] - enable debug logging
 * @property {boolean} [throwOnError=false] - throw error if any deferred function fails
 * @property {function|null} [errorReporter=null] - function to report errors
 */

/**
 * @typedef {Object} deferred
 * @property {Function} callback - the deferred callback function
 * @property {number|null} [timeout=null] - timeout for deferred functions
 * @property {string} functionName - the name of the function
 * @property {boolean} isCancelled - whether the deferred function has been cancelled
 * @property {Function} cancel - function to cancel the deferred function
 */

/**
 * a wrapper function that lets you execute functions later with error handling
 * @param {Function} fn - the main function to execute with deferred functions
 * @param {deferOptions} [options={}] - global options for deferred functions
 * @returns {Function} - a function that, when called, will run the provided function with deferred functions
 */
function withDefer(fn, options = {}) {
	/**
	 * creates a deferral context with the provided global options
	 * @param {deferOptions} [globalOptions={}] - global options for the deferral context
	 * @template T
	 * @returns {{defer: function(Function, deferOptions): {cancel: Function}, run: function(Function): Promise<void>}} - an object with defer and run methods
	 */
	function createDefer(globalOptions = {}) {
		const {
			timeout = null,
			debug = false,
			throwOnError = false,
			errorReporter = null,
		} = globalOptions;

		/** @type {deferred[]} */
		const deferQueue = [];

		/**
		 * adds a deferred function to the queue
		 * @param {Function} callback - the deferred function to be executed later
		 * @param {deferOptions} [localOptions={}] - local options for the deferred function
		 * @returns {{cancel: Function}} - an object with a cancel method for the deferred function
		 */
		function defer(callback, localOptions = {}) {
			if (typeof callback !== "function") {
				throw new Error("callback must be a function");
			}

			const deferred = {
				callback,
				...globalOptions,
				...localOptions,
				functionName: callback.name || "anonymous",
				isCancelled: false,
				cancel() {
					deferred.isCancelled = true;
				},
			};

			deferQueue.unshift(deferred);
			return { cancel: deferred.cancel };
		}

		/**
		 * runs the main function and the deferred functions in order
		 * @param {Function} fn - the main function to execute
		 */
		async function run(fn) {
			try {
				await fn();
			} finally {
				await executeDeferredFunctions();
			}
		}

		/**
		 * executes all deferred functions in the queue
		 * @template T
		 * @returns {Promise<(string | T)[]>} - a promise that resolves when all deferred functions are executed
		 */
		async function executeDeferredFunctions() {
			const results = await Promise.allSettled(
				deferQueue.map((deferred, index) => handleDeferred(deferred, index)),
			);

			handleErrors(results);
			return results.map((result) =>
				result.status === "fulfilled" ? result.value : "promise was rejected",
			);
		}

		/**
		 * handles the execution of a single deferred function
		 * @param {deferred} deferred - the deferred function object
		 * @param {number} index - the index of the deferred function in the queue
		 * @template T
		 * @returns {Promise<any>} - a promise that resolves when the function is executed or cancelled
		 */
		function handleDeferred({ callback, timeout, isCancelled }, index) {
			return new Promise((resolve, reject) => {
				let timer;

				if (timeout) {
					timer = setTimeout(() => {
						const error = new Error("timeout exceeded");
						reportError(error, index, "timed out");
						reject(error);
					}, timeout);
				}

				if (isCancelled) {
					resolve("deferred function was cancelled");
					return;
				}

				Promise.resolve(callback())
					.then((result) => {
						clearTimeout(timer);
						resolve(isCancelled ? "deferred function was cancelled" : result);
					})
					.catch((err) => {
						clearTimeout(timer);
						if (!isCancelled) {
							reportError(err, index, "failed to execute");
							reject(err);
						}
					});
			});
		}

		/**
		 * reports errors with a standard format
		 * @param {Error} err - the error object
		 * @param {number} index - the index of the deferred function
		 * @param {string} action - the action that caused the error
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
		 * handles errors from all deferred functions
		 * @template T
		 * @param {PromiseSettledResult<(T)>[]} results - the results of deferred functions
		 */
		function handleErrors(results) {
			const errors = results
				.filter((result) => result.status === "rejected")
				.map((result, index) => {
					const { functionName } = deferQueue[index];
					const err = result.reason;
					const message = `promise rejection in deferred function ${index} (${functionName}): ${err.message}`;
					if (debug) {
						console.error(message);
					}
					return err;
				});

			if (throwOnError && errors.length > 0) {
				throw new Error(`${errors.length} deferred functions failed`);
			}
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
