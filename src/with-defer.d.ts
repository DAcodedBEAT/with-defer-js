/**
 * Options for configuring deferred function behavior
 */
export interface DeferOptions {
	/** Timeout in milliseconds for deferred functions */
	timeout?: number | null;
	/** Enable debug logging */
	debug?: boolean;
	/** Throw error if any deferred function fails */
	throwOnError?: boolean;
	/** Function to report errors */
	errorReporter?: ((error: Error, context: ErrorContext) => void) | null;
}

/**
 * Error context information passed to errorReporter
 */
export interface ErrorContext {
	/** The error object */
	err: Error;
	/** The index of the deferred function */
	index: number;
	/** The error message */
	message: string;
}

/**
 * Return type of the defer function
 */
export interface DeferredFunction {
	/** Cancel the deferred function */
	cancel: () => void;
	/** Promise that resolves when the deferred function completes */
	promise: Promise<unknown>;
}

/**
 * Type for the defer function passed to the main function
 */
export type DeferFunction = (
	callback: () => unknown | Promise<unknown>,
	options?: DeferOptions,
) => DeferredFunction;

/**
 * Creates a wrapper function that allows for deferred execution with error handling
 * @param fn - The main function to execute that receives a defer function
 * @param options - Global options for deferred functions
 * @returns A function that runs the provided function with deferred execution
 */
export function withDefer<T extends readonly unknown[], R>(
	fn: (defer: DeferFunction, ...args: T) => Promise<R> | R,
	options?: DeferOptions,
): (...args: T) => Promise<void>;
