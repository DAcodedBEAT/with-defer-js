export type ErrorContext = {
	/**
	 * - The error object
	 */
	err: unknown;
	/**
	 * - The index of the deferred function
	 */
	index: number;
	/**
	 * - The error message
	 */
	message: string;
};
export type ErrorReporter = (arg0: unknown, arg1: ErrorContext) => void;
export type DeferOptions = {
	/**
	 * - Timeout for deferred functions
	 */
	timeout?: number | null | undefined;
	/**
	 * - Enable debug logging
	 */
	debug?: boolean | undefined;
	/**
	 * - Throw error if any deferred function fails
	 */
	throwOnError?: boolean | undefined;
	/**
	 * - Function to report errors
	 */
	errorReporter?: ErrorReporter | null | undefined;
};
export type RunContext = {
	/**
	 * - Whether the main function is currently pending with an error (false once recovered)
	 */
	hasError: boolean;
	/**
	 * - The main function's pending error, meaningful only when hasError is true
	 */
	error: unknown;
	/**
	 * - The main function's pending return value, meaningful only when hasError is false
	 */
	value: unknown;
	/**
	 * - Suppresses the pending error (if any) and sets the final return value,
	 * mirroring Go's `recover()` + named-return mutation. Reflects the current state right before each deferred runs, so
	 * a later (earlier-registered) deferred sees whatever an earlier (later-registered) one already recovered/set.
	 */
	recover: (arg0: unknown) => void;
};
export type CallbackFunction = (arg0: RunContext | undefined) => unknown | Promise<unknown>;
export type Deferred = {
	/**
	 * - The deferred callback function (nulled out after execution for GC)
	 */
	callback: CallbackFunction | null;
	/**
	 * - Timeout for the deferred function
	 */
	timeout: number | null;
	/**
	 * - The name of the function
	 */
	functionName: string;
	/**
	 * - Whether the deferred function has been cancelled
	 */
	isCancelled: boolean;
	/**
	 * - Function to resolve the deferred promise (nulled out after execution for GC)
	 */
	resolve: ((arg0: unknown) => void) | null;
	/**
	 * - Per-deferred error reporter function
	 */
	errorReporter: ErrorReporter | null;
	/**
	 * - Whether debug logging is enabled for this deferred
	 */
	debug: boolean;
	/**
	 * - Whether a failure of this deferred should be included in the thrown AggregateError
	 */
	throwOnError: boolean;
};
export type DeferredResult = {
	/**
	 * - Function to cancel the deferred execution
	 */
	cancel: () => void;
	/**
	 * - Promise that resolves when the deferred function completes
	 */
	promise: Promise<unknown>;
};
export type DeferFunction = (
	callback: CallbackFunction,
	localOptions?: DeferOptions,
) => DeferredResult;
export type DeferredOutcome =
	| {
			ok: true;
			value: unknown;
	  }
	| {
			ok: false;
			error: unknown;
	  };
export type RunOutcome = {
	hasError: boolean;
	error: unknown;
	value: unknown;
};
/**
 * Creates a wrapper function that allows for deferred execution with error handling
 * @param {(defer: DeferFunction, ...args: unknown[]) => (unknown|Promise<unknown>)} fn - The main function to execute
 * @param {DeferOptions} [options={}] - Global options for deferred functions
 * @returns {(...args: unknown[]) => Promise<unknown>} - A function that runs the provided function with deferred execution and returns the main function's return value
 */
export function withDefer(
	fn: (defer: DeferFunction, ...args: unknown[]) => unknown | Promise<unknown>,
	options?: DeferOptions,
): (...args: unknown[]) => Promise<unknown>;
