import { describe, expect, it, vi } from "vitest";
import { withDefer } from "../src/with-defer";

describe("withDefer", () => {
	it("should execute a single synchronous deferred function", async () => {
		const logs = [];

		const example = withDefer(async (defer) => {
			defer(() => {
				logs.push("Sync Cleanup completed");
			});

			await new Promise((resolve) => setTimeout(resolve, 10));
		});

		await example();
		expect(logs).toEqual(["Sync Cleanup completed"]);
	});

	it("should execute a single asynchronous deferred function", async () => {
		const logs = [];

		const example = withDefer(async (defer) => {
			const deferred = defer(async () => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				logs.push("Async Cleanup completed");
			});

			await new Promise((resolve) => setTimeout(resolve, 20));
		});

		await example();
		expect(logs).toEqual(["Async Cleanup completed"]);
	});

	it("should handle errors in a single deferred function", async () => {
		const errorReporter = vi.fn(); // Mock errorReporter
		const logs = [];

		const example = withDefer(
			async (defer) => {
				const deferred = defer(async () => {
					throw new Error("Error in Cleanup");
				});

				await new Promise((resolve) => setTimeout(resolve, 10));
			},
			{ errorReporter },
		);

		await example();

		expect(errorReporter).toHaveBeenCalled();
		expect(logs).toEqual([]);
	});

	it("should propagate error when throwOnError is true for asynchronous deferred function", async () => {
		const example = withDefer(async (defer) => {
			const deferred = defer(
				async () => {
					throw new Error("Error in Deferred Function");
				},
				{ throwOnError: true },
			);

			await new Promise((resolve) => setTimeout(resolve, 10));
		});

		expect(
			async () =>
				await example().toThrow("One or more deferred functions failed."),
		);
	});

	it("should propagate error when throwOnError is true for synchronous deferred function", async () => {
		const example = withDefer((defer) => {
			const deferred = defer(
				() => {
					throw new Error("Error in Deferred Function");
				},
				{ throwOnError: true },
			);

			setTimeout(resolve, 10);
		});

		expect(() => example().toThrow("One or more deferred functions failed."));
	});

	it("should respect cancellation of a single deferred function", async () => {
		const errorReporter = vi.fn();
		const logs = [];

		const example = withDefer(
			async (defer) => {
				const deferred = defer(async () => {
					await new Promise((resolve) => setTimeout(resolve, 200));
					logs.push("Async Cleanup completed");
				});

				deferred.cancel();
				await new Promise((resolve) => setTimeout(resolve, 10));
			},
			{ errorReporter },
		);

		await example();

		expect(errorReporter).not.toHaveBeenCalled();
		expect(logs).toEqual([]);
	});

	it("should handle timeout for a single deferred function", async () => {
		const errorReporter = vi.fn();

		const example = withDefer(
			async (defer) => {
				const deferred = defer(
					async () => {
						await new Promise((resolve) => setTimeout(resolve, 500)); // Longer than the timeout
					},
					{ timeout: 200 },
				);

				await new Promise((resolve) => setTimeout(resolve, 10));
			},
			{ errorReporter },
		);

		await example();

		expect(errorReporter).toHaveBeenCalled();
	});

	it("should execute multiple synchronous deferred functions", async () => {
		const logs = [];

		const example = withDefer(async (defer) => {
			const deferred1 = defer(() => {
				logs.push("Cleanup 1 completed");
			});
			const deferred2 = defer(() => {
				logs.push("Cleanup 2 completed");
			});

			await new Promise((resolve) => setTimeout(resolve, 10));
		});

		await example();
		expect(logs).toEqual(["Cleanup 2 completed", "Cleanup 1 completed"]);
	});

	it("should execute multiple asynchronous deferred functions", async () => {
		const logs = [];

		const example = withDefer(async (defer) => {
			const deferred1 = defer(async () => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				logs.push("Async Cleanup 1 completed");
			});
			const deferred2 = defer(async () => {
				await new Promise((resolve) => setTimeout(resolve, 20));
				logs.push("Async Cleanup 2 completed");
			});

			await new Promise((resolve) => setTimeout(resolve, 30));
		});

		await example();
		expect(logs).toEqual([
			"Async Cleanup 1 completed",
			"Async Cleanup 2 completed",
		]);
	});

	it("should handle mixed deferred functions (sync and async)", async () => {
		const logs = [];

		const example = withDefer(async (defer) => {
			const deferred1 = defer(() => {
				logs.push("Sync Cleanup 1 completed");
			});
			const deferred2 = defer(async () => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				logs.push("Async Cleanup 2 completed");
			});

			await new Promise((resolve) => setTimeout(resolve, 50));
		});

		await example();
		expect(logs).toEqual([
			"Sync Cleanup 1 completed",
			"Async Cleanup 2 completed",
		]);
	});

	it("should handle errors in multiple deferred functions", async () => {
		const errorReporter = vi.fn(); // Mock errorReporter
		const logs = [];

		const example = withDefer(
			async (defer) => {
				const deferred1 = defer(() => {
					logs.push("Sync Cleanup 1 completed");
				});
				const deferred2 = defer(async () => {
					throw new Error("Error in Async Cleanup 2");
				});

				await new Promise((resolve) => setTimeout(resolve, 10));
			},
			{ errorReporter },
		);

		await example();

		expect(errorReporter).toHaveBeenCalled();
		expect(logs).toEqual(["Sync Cleanup 1 completed"]);
	});

	it("should respect cancellation of multiple deferred functions", async () => {
		const errorReporter = vi.fn();
		const logs = [];

		const example = withDefer(
			async (defer) => {
				const deferred1 = defer(async () => {
					await new Promise((resolve) => setTimeout(resolve, 10));
					logs.push("Async Cleanup 1 completed");
				});
				const deferred2 = defer(async () => {
					await new Promise((resolve) => setTimeout(resolve, 20));
					logs.push("Async Cleanup 2 completed");
				});

				deferred1.cancel(); // Cancel the first deferred function
			},
			{ errorReporter },
		);

		await example();

		expect(errorReporter).not.toHaveBeenCalled();
		expect(logs).toEqual(["Async Cleanup 2 completed"]);
	});

	it("should handle timeouts in multiple deferred functions", async () => {
		const errorReporter = vi.fn();

		const example = withDefer(
			async (defer) => {
				const deferred1 = defer(
					async () => {
						await new Promise((resolve) => setTimeout(resolve, 5_000)); // Longer than the timeout
					},
					{ timeout: 20 },
				);
				const deferred2 = defer(async () => {
					await new Promise((resolve) => setTimeout(resolve, 10));
				});

				await new Promise((resolve) => setTimeout(resolve, 10));
			},
			{ errorReporter },
		);

		await example();

		expect(errorReporter).toHaveBeenCalled();
	});

	it("should handle nesting of two withDefer functions", async () => {
		const logs = [];
		const errorReporter = vi.fn(); // Mock errorReporter

		const outerExample = withDefer(
			async (deferOuter) => {
				// First deferred function
				const deferred1 = deferOuter(async () => {
					await new Promise((resolve) => setTimeout(resolve, 10));
					logs.push("First Cleanup completed");
				});

				// Simulate some delay before calling the next
				await new Promise((resolve) => setTimeout(resolve, 50));

				// Inner withDefer function
				const innerExample = withDefer(
					async (deferInner) => {
						const deferred2 = deferInner(async () => {
							await new Promise((resolve) => setTimeout(resolve, 10));
							logs.push("Second Cleanup completed");
						});

						// Wait for a bit before allowing the second cleanup to run
						await new Promise((resolve) => setTimeout(resolve, 20));
					},
					{ errorReporter },
				);

				await innerExample();
			},
			{ errorReporter },
		);

		await outerExample();

		expect(logs).toEqual([
			"Second Cleanup completed",
			"First Cleanup completed",
		]);
		expect(errorReporter).not.toHaveBeenCalled(); // Ensure no errors occurred
	});

	it("should execute two separate withDefer invocations in the same lexical scope", async () => {
		const logs = [];
		const errorReporter = vi.fn(); // Mock errorReporter

		const firstExample = withDefer(
			async (defer) => {
				const deferred1 = defer(async () => {
					await new Promise((resolve) => setTimeout(resolve, 10));
					logs.push("First Cleanup completed");
				});

				await new Promise((resolve) => setTimeout(resolve, 50));
			},
			{ errorReporter },
		);

		const secondExample = withDefer(
			async (defer) => {
				const deferred2 = defer(async () => {
					await new Promise((resolve) => setTimeout(resolve, 150));
					logs.push("Second Cleanup completed");
				});

				await new Promise((resolve) => setTimeout(resolve, 10));
			},
			{ errorReporter },
		);

		await firstExample();
		await secondExample();

		expect(logs).toEqual([
			"First Cleanup completed",
			"Second Cleanup completed",
		]);
		expect(errorReporter).not.toHaveBeenCalled(); // Ensure no errors occurred
	});

	it("should handle errors in both withDefer invocations independently", async () => {
		const logs = [];
		const errorReporter = vi.fn(); // Mock errorReporter

		const firstExample = withDefer(
			async (defer) => {
				defer(async () => {
					throw new Error("Error in First Cleanup");
				});

				// Await some time to ensure that the deferred function has time to execute
				await new Promise((resolve) => setTimeout(resolve, 10));
			},
			{ errorReporter },
		);

		const secondExample = withDefer(
			async (defer) => {
				defer(async () => {
					await new Promise((resolve) => setTimeout(resolve, 10));
					logs.push("Second Cleanup completed");
				});

				// Await some time to ensure that the deferred function has time to execute
				await new Promise((resolve) => setTimeout(resolve, 50));
			},
			{ errorReporter },
		);

		await firstExample();
		await secondExample();

		// Check the error handling results
		expect(errorReporter).toHaveBeenCalledTimes(1); // Ensure errorReporter was called for the first example
		expect(logs).toEqual(["Second Cleanup completed"]); // Only the second cleanup should complete
	});

	it("should respect cancellation in both withDefer invocations independently", async () => {
		const logs = [];
		const errorReporter = vi.fn();

		const firstExample = withDefer(
			async (defer) => {
				const deferred1 = defer(async () => {
					await new Promise((resolve) => setTimeout(resolve, 200));
					logs.push("First Cleanup completed");
				});

				deferred1.cancel(); // Cancel the first deferred function
				await new Promise((resolve) => setTimeout(resolve, 10));
			},
			{ errorReporter },
		);

		const secondExample = withDefer(
			async (defer) => {
				const deferred2 = defer(async () => {
					await new Promise((resolve) => setTimeout(resolve, 10));
					logs.push("Second Cleanup completed");
				});

				await new Promise((resolve) => setTimeout(resolve, 50));
			},
			{ errorReporter },
		);

		await firstExample();
		await secondExample();

		expect(errorReporter).not.toHaveBeenCalled(); // Ensure no errors occurred
		expect(logs).toEqual(["Second Cleanup completed"]); // Only the second cleanup should complete
	});

	it("should handle timeouts in both withDefer invocations independently", async () => {
		const errorReporter = vi.fn();

		const firstExample = withDefer(
			async (defer) => {
				const deferred1 = defer(
					async () => {
						await new Promise((resolve) => setTimeout(resolve, 3_000)); // Longer than the timeout
					},
					{ timeout: 200 },
				);

				await new Promise((resolve) => setTimeout(resolve, 10));
			},
			{ errorReporter },
		);

		const secondExample = withDefer(
			async (defer) => {
				const deferred2 = defer(
					async () => {
						await new Promise((resolve) => setTimeout(resolve, 10));
					},
					{ timeout: 200 },
				);

				await new Promise((resolve) => setTimeout(resolve, 50));
			},
			{ errorReporter },
		);

		await firstExample();
		await secondExample();

		expect(errorReporter).toHaveBeenCalledTimes(1); // Ensure errorReporter was called for the first example
	});

	it("should execute mixed sync and async deferred functions in both withDefer invocations independently", async () => {
		const logs = [];
		const errorReporter = vi.fn();

		const firstExample = withDefer(
			async (defer) => {
				const deferred1 = defer(() => {
					logs.push("Sync Cleanup 1 completed");
				});

				const deferred2 = defer(async () => {
					await new Promise((resolve) => setTimeout(resolve, 10));
					logs.push("Async Cleanup 1 completed");
				});

				await new Promise((resolve) => setTimeout(resolve, 50));
			},
			{ errorReporter },
		);

		const secondExample = withDefer(
			async (defer) => {
				const deferred3 = defer(async () => {
					await new Promise((resolve) => setTimeout(resolve, 150));
					logs.push("Async Cleanup 2 completed");
				});

				const deferred4 = defer(() => {
					logs.push("Sync Cleanup 2 completed");
				});

				await new Promise((resolve) => setTimeout(resolve, 10));
			},
			{ errorReporter },
		);

		await firstExample();
		await secondExample();

		expect(logs).toEqual([
			"Sync Cleanup 1 completed",
			"Async Cleanup 1 completed",
			"Sync Cleanup 2 completed",
			"Async Cleanup 2 completed",
		]);
		expect(errorReporter).not.toHaveBeenCalled();
	});

	it("should execute withDefer invocations in sequence and respect timing", async () => {
		const logs = [];
		const errorReporter = vi.fn();

		const firstExample = withDefer(
			async (defer) => {
				const deferred1 = defer(async () => {
					await new Promise((resolve) => setTimeout(resolve, 10));
					logs.push("First Cleanup completed");
				});
			},
			{ errorReporter },
		);

		const secondExample = withDefer(
			async (defer) => {
				const deferred2 = defer(async () => {
					await new Promise((resolve) => setTimeout(resolve, 50));
					logs.push("Second Cleanup completed");
				});
			},
			{ errorReporter },
		);

		await firstExample();
		await secondExample();

		expect(logs).toEqual([
			"First Cleanup completed",
			"Second Cleanup completed",
		]);
		expect(errorReporter).not.toHaveBeenCalled();
	});

	it("should include function name in error message for named functions", async () => {
		const example = withDefer(async (defer) => {
			defer(namedFunction, { throwOnError: true });
		});

		function namedFunction() {
			throw new Error("Error in Named Function");
		}

		expect(async () => await example().toThrow("1 deferred functions failed."));
		expect(
			async () =>
				await example().toMatch(
					/promise rejection in deferred function \d+ \(namedFunction\): Error in Named Function/,
				),
		);
	});

	it("should include function name in error message for anonymous functions", async () => {
		const example = withDefer(async (defer) => {
			defer(
				() => {
					throw new Error("Error in Anonymous Function");
				},
				{ throwOnError: true },
			);
		});

		expect(async () => await example().toThrow("1 deferred functions failed."));
		expect(
			async () =>
				await example().toMatch(
					/promise rejection in deferred function \d+ \(anonymous\): Error in Named Function/,
				),
		);
	});

	it("should work when no deferred functions are provided", async () => {
		const example = withDefer(async (defer) => {
			// No deferred functions
			return;
		});

		await example(); // Should not throw or log any errors
	});

	it("should handle immediate cancellation of a deferred function", async () => {
		const logs = [];
		const errorReporter = vi.fn();

		const example = withDefer(
			async (defer) => {
				const deferred = defer(async () => {
					await new Promise((resolve) => setTimeout(resolve, 100));
					logs.push("This should not happen");
				});

				deferred.cancel(); // Cancel immediately
				await new Promise((resolve) => setTimeout(resolve, 10));
			},
			{ errorReporter },
		);

		await example();
		expect(logs).toEqual([]);
		expect(errorReporter).not.toHaveBeenCalled();
	});

	it("should throw error for non-function callbacks", async () => {
		const example = withDefer(async (defer) => {
			expect(() => defer("not a function")).toThrow(
				"callback must be a function",
			);
		});

		await example();
	});
});
