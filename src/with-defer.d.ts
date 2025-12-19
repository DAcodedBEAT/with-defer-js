export type ErrorContext = {
    /**
     * - The error object
     */
    err: Error;
    /**
     * - The index of the deferred function
     */
    index: number;
    /**
     * - The error message
     */
    message: string;
};
export type ErrorReporter = (arg0: Error, arg1: ErrorContext) => void;
export type DeferOptions = {
    /**
     * - Timeout for deferred functions
     */
    timeout?: number | null;
    /**
     * - Enable debug logging
     */
    debug?: boolean;
    /**
     * - Throw error if any deferred function fails
     */
    throwOnError?: boolean;
    /**
     * - Function to report errors
     */
    errorReporter?: ErrorReporter | null;
};
export type CallbackFunction = () => (unknown | Promise<unknown>);
export type Deferred = {
    /**
     * - The deferred callback function
     */
    callback: CallbackFunction;
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
     * - Function to resolve the deferred promise
     */
    resolve: (arg0: unknown) => void;
    /**
     * - Per-deferred error reporter function
     */
    errorReporter: ErrorReporter | null;
    /**
     * - Whether debug logging is enabled for this deferred
     */
    debug: boolean;
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
export type DeferFunction = (arg0: CallbackFunction, arg1: DeferOptions | undefined) => DeferredResult;
export type DeferContext = {
    /**
     * - Function to defer execution
     */
    defer: DeferFunction;
    /**
     * - Function to run the main function and deferred functions
     */
    run: (arg0: () => (unknown | Promise<unknown>)) => Promise<unknown>;
};
/**
 * Creates a wrapper function that allows for deferred execution with error handling
 * @param {function(DeferFunction, ...unknown[]): (unknown|Promise<unknown>)} fn - The main function to execute
 * @param {DeferOptions} [options={}] - Global options for deferred functions
 * @returns {function(...unknown[]): Promise<unknown>} - A function that runs the provided function with deferred execution and returns the main function's return value
 */
export function withDefer(fn: (arg0: DeferFunction, ...args: unknown[][]) => (unknown | Promise<unknown>), options?: DeferOptions): (...args: unknown[][]) => Promise<unknown>;
