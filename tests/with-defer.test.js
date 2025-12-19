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
			const _deferred = defer(async () => {
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
				const _deferred = defer(async () => {
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
		const example = withDefer(
			async (defer) => {
				defer(async () => {
					throw new Error("Error in Deferred Function");
				});

				await new Promise((resolve) => setTimeout(resolve, 10));
			},
			{ throwOnError: true },
		);

		await expect(example()).rejects.toThrow("1 deferred functions failed");
	});

	it("should propagate error when throwOnError is true for synchronous deferred function", async () => {
		const example = withDefer(
			async (defer) => {
				defer(() => {
					throw new Error("Error in Deferred Function");
				});

				await new Promise((resolve) => setTimeout(resolve, 10));
			},
			{ throwOnError: true },
		);

		await expect(example()).rejects.toThrow("1 deferred functions failed");
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
				const _deferred = defer(
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
			const _deferred1 = defer(() => {
				logs.push("Cleanup 1 completed");
			});
			const _deferred2 = defer(() => {
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
			const _deferred1 = defer(async () => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				logs.push("Async Cleanup 1 completed");
			});
			const _deferred2 = defer(async () => {
				await new Promise((resolve) => setTimeout(resolve, 20));
				logs.push("Async Cleanup 2 completed");
			});

			await new Promise((resolve) => setTimeout(resolve, 30));
		});

		await example();
		expect(logs).toEqual([
			"Async Cleanup 2 completed",
			"Async Cleanup 1 completed",
		]);
	});

	it("should handle mixed deferred functions (sync and async)", async () => {
		const logs = [];

		const example = withDefer(async (defer) => {
			const _deferred1 = defer(() => {
				logs.push("Sync Cleanup 1 completed");
			});
			const _deferred2 = defer(async () => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				logs.push("Async Cleanup 2 completed");
			});

			await new Promise((resolve) => setTimeout(resolve, 50));
		});

		await example();
		expect(logs).toEqual([
			"Async Cleanup 2 completed",
			"Sync Cleanup 1 completed",
		]);
	});

	it("should handle errors in multiple deferred functions", async () => {
		const errorReporter = vi.fn(); // Mock errorReporter
		const logs = [];

		const example = withDefer(
			async (defer) => {
				const _deferred1 = defer(() => {
					logs.push("Sync Cleanup 1 completed");
				});
				const _deferred2 = defer(async () => {
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
				const _deferred2 = defer(async () => {
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
				const _deferred1 = defer(
					async () => {
						await new Promise((resolve) => setTimeout(resolve, 5_000)); // Longer than the timeout
					},
					{ timeout: 20 },
				);
				const _deferred2 = defer(async () => {
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
				const _deferred1 = deferOuter(async () => {
					await new Promise((resolve) => setTimeout(resolve, 10));
					logs.push("First Cleanup completed");
				});

				// Simulate some delay before calling the next
				await new Promise((resolve) => setTimeout(resolve, 50));

				// Inner withDefer function
				const innerExample = withDefer(
					async (deferInner) => {
						const _deferred2 = deferInner(async () => {
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
				const _deferred1 = defer(async () => {
					await new Promise((resolve) => setTimeout(resolve, 10));
					logs.push("First Cleanup completed");
				});

				await new Promise((resolve) => setTimeout(resolve, 50));
			},
			{ errorReporter },
		);

		const secondExample = withDefer(
			async (defer) => {
				const _deferred2 = defer(async () => {
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
				const _deferred2 = defer(async () => {
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
				const _deferred1 = defer(
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
				const _deferred2 = defer(
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
				const _deferred1 = defer(() => {
					logs.push("Sync Cleanup 1 completed");
				});

				const _deferred2 = defer(async () => {
					await new Promise((resolve) => setTimeout(resolve, 10));
					logs.push("Async Cleanup 1 completed");
				});

				await new Promise((resolve) => setTimeout(resolve, 50));
			},
			{ errorReporter },
		);

		const secondExample = withDefer(
			async (defer) => {
				const _deferred3 = defer(async () => {
					await new Promise((resolve) => setTimeout(resolve, 150));
					logs.push("Async Cleanup 2 completed");
				});

				const _deferred4 = defer(() => {
					logs.push("Sync Cleanup 2 completed");
				});

				await new Promise((resolve) => setTimeout(resolve, 10));
			},
			{ errorReporter },
		);

		await firstExample();
		await secondExample();

		expect(logs).toEqual([
			"Async Cleanup 1 completed",
			"Sync Cleanup 1 completed",
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
				const _deferred1 = defer(async () => {
					await new Promise((resolve) => setTimeout(resolve, 10));
					logs.push("First Cleanup completed");
				});
			},
			{ errorReporter },
		);

		const secondExample = withDefer(
			async (defer) => {
				const _deferred2 = defer(async () => {
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
		function namedFunction() {
			throw new Error("Error in Named Function");
		}

		const example = withDefer(
			async (defer) => {
				defer(namedFunction);
			},
			{ throwOnError: true },
		);

		await expect(example()).rejects.toThrow("1 deferred functions failed");
	});

	it("should include function name in error message for anonymous functions", async () => {
		const example = withDefer(
			async (defer) => {
				defer(() => {
					throw new Error("Error in Anonymous Function");
				});
			},
			{ throwOnError: true },
		);

		await expect(example()).rejects.toThrow("1 deferred functions failed");
	});

	it("should work when no deferred functions are provided", async () => {
		const example = withDefer(async (_defer) => {
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

	it("should throw error for invalid withDefer arguments", () => {
		expect(() => withDefer("not a function")).toThrow(
			"First argument must be a function",
		);
		expect(() => withDefer(() => {}, "not an object")).toThrow(
			"Options must be an object or null",
		);
	});

	it("should throw error for invalid defer options", async () => {
		const example = withDefer(async (defer) => {
			expect(() => defer(() => {}, "not an object")).toThrow(
				"Options must be an object or null",
			);
			expect(() => defer(() => {}, { timeout: "not a number" })).toThrow(
				"timeout must be a finite number or null",
			);
			expect(() =>
				defer(() => {}, { timeout: Number.POSITIVE_INFINITY }),
			).toThrow("timeout must be a finite number or null");
			expect(() => defer(() => {}, { timeout: Number.NaN })).toThrow(
				"timeout must be a finite number or null",
			);
			expect(() => defer(() => {}, { debug: "not a boolean" })).toThrow(
				"debug must be a boolean",
			);
			expect(() => defer(() => {}, { throwOnError: "not a boolean" })).toThrow(
				"throwOnError must be a boolean",
			);
			expect(() =>
				defer(() => {}, { errorReporter: "not a function" }),
			).toThrow("errorReporter must be a function or null");
		});

		await example();
	});
});

describe("Edge Cases and Production Readiness Tests", () => {
	it("should handle null/undefined callbacks gracefully", async () => {
		const example = withDefer(async (defer) => {
			expect(() => defer(null)).toThrow("callback must be a function");
			expect(() => defer(undefined)).toThrow("callback must be a function");
			expect(() => defer(123)).toThrow("callback must be a function");
			expect(() => defer("string")).toThrow("callback must be a function");
			expect(() => defer({})).toThrow("callback must be a function");
		});

		await example();
	});

	it("should handle very large timeout values", async () => {
		const logs = [];
		const example = withDefer(async (defer) => {
			defer(
				() => {
					logs.push("executed");
				},
				{ timeout: 1000000 },
			);
		});

		await example();
		expect(logs).toEqual(["executed"]);
	});

	it("should handle zero timeout (treated as no timeout)", async () => {
		const logs = [];
		const example = withDefer(async (defer) => {
			defer(
				async () => {
					await new Promise((resolve) => setTimeout(resolve, 10));
					logs.push("executed with zero timeout");
				},
				{ timeout: 0 },
			);
		});

		await example();
		expect(logs).toEqual(["executed with zero timeout"]);
	});

	it("should handle negative timeout values (treated as no timeout)", async () => {
		const logs = [];
		const example = withDefer(async (defer) => {
			defer(
				async () => {
					await new Promise((resolve) => setTimeout(resolve, 10));
					logs.push("executed with negative timeout");
				},
				{ timeout: -100 },
			);
		});

		await example();
		expect(logs).toEqual(["executed with negative timeout"]);
	});

	it("should handle deferred functions that return non-promise values", async () => {
		const logs = [];
		const example = withDefer(async (defer) => {
			defer(() => {
				logs.push("string return");
				return "some string";
			});
			defer(() => {
				logs.push("number return");
				return 42;
			});
			defer(() => {
				logs.push("object return");
				return { key: "value" };
			});
		});

		await example();
		expect(logs).toEqual(["object return", "number return", "string return"]);
	});

	it("should handle deferred functions that throw non-Error objects", async () => {
		const errorReporter = vi.fn();
		const example = withDefer(
			async (defer) => {
				defer(() => {
					throw "string error";
				});
				defer(() => {
					throw { error: "object error" };
				});
				defer(() => {
					throw 404;
				});
			},
			{ errorReporter },
		);

		await example();
		expect(errorReporter).toHaveBeenCalledTimes(3);
	});

	it("should handle cancellation after timeout has started", async () => {
		const logs = [];
		const errorReporter = vi.fn();

		const example = withDefer(
			async (defer) => {
				const deferred = defer(
					async () => {
						await new Promise((resolve) => setTimeout(resolve, 100));
						logs.push("should not execute");
					},
					{ timeout: 50 },
				);

				// Cancel after a delay but before timeout
				setTimeout(() => deferred.cancel(), 30);
				await new Promise((resolve) => setTimeout(resolve, 200));
			},
			{ errorReporter },
		);

		await example();
		expect(logs).toEqual([]);
		expect(errorReporter).not.toHaveBeenCalled();
	});

	it("should handle multiple cancellations of the same deferred function", async () => {
		const logs = [];
		const example = withDefer(async (defer) => {
			const deferred = defer(() => {
				logs.push("should not execute");
			});

			deferred.cancel();
			deferred.cancel(); // Second cancellation should be safe
			deferred.cancel(); // Third cancellation should be safe
		});

		await example();
		expect(logs).toEqual([]);
	});

	it("should handle empty function bodies", async () => {
		const example = withDefer(async (defer) => {
			defer(() => {});
			defer(async () => {});
		});

		await example(); // Should not throw
	});

	it("should handle functions that modify global state", async () => {
		let globalCounter = 0;
		const example = withDefer(async (defer) => {
			defer(() => {
				globalCounter += 1;
			});
			defer(() => {
				globalCounter += 2;
			});
			defer(() => {
				globalCounter += 3;
			});
		});

		await example();
		expect(globalCounter).toBe(6); // 3 + 2 + 1 (LIFO order)
	});

	it("should handle concurrent withDefer executions", async () => {
		const logs = [];
		const createExample = (id) =>
			withDefer(async (defer) => {
				defer(async () => {
					await new Promise((resolve) =>
						setTimeout(resolve, Math.random() * 50),
					);
					logs.push(`defer-${id}`);
				});
				logs.push(`main-${id}`);
			});

		const promises = [
			createExample(1)(),
			createExample(2)(),
			createExample(3)(),
		];

		await Promise.all(promises);
		expect(logs).toContain("main-1");
		expect(logs).toContain("main-2");
		expect(logs).toContain("main-3");
		expect(logs).toContain("defer-1");
		expect(logs).toContain("defer-2");
		expect(logs).toContain("defer-3");
	});

	it("should handle memory pressure with many deferred functions", async () => {
		const numFunctions = 10000;
		let executionCount = 0;

		const example = withDefer(async (defer) => {
			for (let i = 0; i < numFunctions; i++) {
				defer(() => {
					executionCount++;
				});
			}
		});

		await example();
		expect(executionCount).toBe(numFunctions);
	});

	it("should handle deferred functions that create timers", async () => {
		const logs = [];
		let timerId;

		const example = withDefer(async (defer) => {
			defer(() => {
				timerId = setTimeout(() => {
					logs.push("timer executed");
				}, 10);
			});
			defer(() => {
				clearTimeout(timerId);
				logs.push("timer cleared");
			});
		});

		await example();
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(logs).toEqual(["timer cleared", "timer executed"]);
	});

	it("should handle complex nested promise chains in deferred functions", async () => {
		const logs = [];
		const example = withDefer(async (defer) => {
			defer(async () => {
				const result = await Promise.resolve(1)
					.then((x) => x + 1)
					.then((x) => Promise.resolve(x * 2))
					.then((x) => x + 3);
				logs.push(result); // Should be 7: ((1 + 1) * 2) + 3
			});
		});

		await example();
		expect(logs).toEqual([7]);
	});
});

describe("Additional withDefer tests", () => {
	it("should handle a large number of deferred functions", async () => {
		const logs = [];
		const numDeferredFunctions = 1000;

		const example = withDefer(async (defer) => {
			for (let i = 0; i < numDeferredFunctions; i++) {
				defer(() => {
					logs.push(`Deferred function ${i} executed`);
				});
			}
		});

		await example();
		expect(logs.length).toBe(numDeferredFunctions);
		expect(logs[0]).toBe(
			`Deferred function ${numDeferredFunctions - 1} executed`,
		);
		expect(logs[numDeferredFunctions - 1]).toBe("Deferred function 0 executed");
	});

	it("should handle deeply nested withDefer functions", async () => {
		const logs = [];
		const depth = 10;

		const createNestedExample = (currentDepth) =>
			withDefer(async (defer) => {
				defer(() => {
					logs.push(`Depth ${currentDepth} executed`);
				});

				if (currentDepth > 0) {
					await createNestedExample(currentDepth - 1)();
				}
			});

		await createNestedExample(depth)();

		expect(logs.length).toBe(depth + 1);
		expect(logs).toEqual([
			"Depth 0 executed",
			"Depth 1 executed",
			"Depth 2 executed",
			"Depth 3 executed",
			"Depth 4 executed",
			"Depth 5 executed",
			"Depth 6 executed",
			"Depth 7 executed",
			"Depth 8 executed",
			"Depth 9 executed",
			"Depth 10 executed",
		]);
	}, 30_000);

	it("should handle deferred functions that return promises", async () => {
		const logs = [];

		const example = withDefer(async (defer) => {
			defer(async () => {
				logs.push("Result 2");
			});

			defer(async () => {
				logs.push("Result 1");
			});
		});

		await example();
		expect(logs).toEqual(["Result 1", "Result 2"]);
	});

	it("should handle deferred functions with varying execution times", async () => {
		const logs = [];

		const example = withDefer(async (defer) => {
			defer(async () => {
				await new Promise((resolve) => setTimeout(resolve, 30));
				logs.push("Slow function");
			});

			defer(async () => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				logs.push("Medium function");
			});

			defer(() => {
				logs.push("Fast function");
			});
		});

		await example();
		expect(logs).toEqual(["Fast function", "Medium function", "Slow function"]);
	});

	it("should handle errors thrown in the main function", async () => {
		const errorReporter = vi.fn();

		const example = withDefer(
			async (defer) => {
				defer(() => {
					console.log("This should still be called");
				});

				throw new Error("Main function error");
			},
			{ errorReporter },
		);

		await expect(example()).rejects.toThrow("Main function error");
		expect(errorReporter).not.toHaveBeenCalled();
	});

	it("should handle recursive deferred functions", async () => {
		const logs = [];

		const example = withDefer(async (defer) => {
			const recursiveDefer = (count) => {
				if (count <= 0) return;
				defer(async () => {
					logs.push(`Recursive ${count}`);
				});
				recursiveDefer(count - 1);
			};

			recursiveDefer(5);
		});

		await example();
		expect(logs).toEqual([
			"Recursive 1",
			"Recursive 2",
			"Recursive 3",
			"Recursive 4",
			"Recursive 5",
		]);
	}, 30_000);

	console.log("All additional tests completed successfully!");
});

describe("Missing Edge Cases", () => {
	it("should handle synchronous main function (non-async)", async () => {
		const logs = [];

		const example = withDefer((defer) => {
			defer(() => {
				logs.push("cleanup executed");
			});
			logs.push("main executed");
		});

		await example();
		expect(logs).toEqual(["main executed", "cleanup executed"]);
	});

	it("should handle deferred functions with different timeout values in same context", async () => {
		const logs = [];
		const errorReporter = vi.fn();

		const example = withDefer(
			async (defer) => {
				defer(
					async () => {
						await new Promise((resolve) => setTimeout(resolve, 300));
						logs.push("should timeout");
					},
					{ timeout: 100 },
				);
				defer(
					async () => {
						await new Promise((resolve) => setTimeout(resolve, 50));
						logs.push("should complete");
					},
					{ timeout: 200 },
				);
				defer(async () => {
					await new Promise((resolve) => setTimeout(resolve, 10));
					logs.push("no timeout");
				});
			},
			{ errorReporter },
		);

		await example();
		expect(logs).toEqual(["no timeout", "should complete"]);
		expect(errorReporter).toHaveBeenCalledTimes(1);
	});

	it("should handle multiple errors with throwOnError=true", async () => {
		const example = withDefer(
			async (defer) => {
				defer(() => {
					throw new Error("First error");
				});
				defer(() => {
					throw new Error("Second error");
				});
				defer(() => {
					throw new Error("Third error");
				});
			},
			{ throwOnError: true },
		);

		try {
			await example();
			expect.fail("Should have thrown AggregateError");
		} catch (err) {
			expect(err).toBeInstanceOf(AggregateError);
			expect(err.message).toBe("3 deferred functions failed");
			expect(err.errors).toHaveLength(3);
		}
	});

	it("should verify debug logging output", async () => {
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		const example = withDefer(
			async (defer) => {
				defer(() => {
					throw new Error("Debug test error");
				});
			},
			{ debug: true },
		);

		await example();
		expect(consoleSpy).toHaveBeenCalled();
		expect(consoleSpy.mock.calls[0][0]).toContain("error in deferred function");

		consoleSpy.mockRestore();
	});

	it("should handle global vs local option conflicts", async () => {
		const globalReporter = vi.fn();
		const localReporter = vi.fn();

		const example = withDefer(
			async (defer) => {
				defer(
					() => {
						throw new Error("Local override test");
					},
					{ errorReporter: localReporter, throwOnError: false },
				);
			},
			{ errorReporter: globalReporter, throwOnError: false },
		);

		await example();
		expect(localReporter).toHaveBeenCalled();
		expect(globalReporter).not.toHaveBeenCalled();
	});

	it("should handle race conditions between cancellation and execution", async () => {
		const logs = [];
		let cancelFunction;

		const example = withDefer(async (defer) => {
			const deferred = defer(async () => {
				await new Promise((resolve) => setTimeout(resolve, 5));
				logs.push("should not execute");
			});

			cancelFunction = deferred.cancel;

			// Start cancellation in parallel with execution
			setTimeout(() => cancelFunction(), 1);
			await new Promise((resolve) => setTimeout(resolve, 10));
		});

		await example();
		expect(logs).toEqual([]);
	});

	it("should handle invalid timeout edge cases", async () => {
		const example = withDefer(async (defer) => {
			expect(() => defer(() => {}, { timeout: "100" })).toThrow(
				"timeout must be a finite number or null",
			);
			expect(() => defer(() => {}, { timeout: [] })).toThrow(
				"timeout must be a finite number or null",
			);
			expect(() => defer(() => {}, { timeout: {} })).toThrow(
				"timeout must be a finite number or null",
			);
		});

		await example();
	});

	it("should handle very fast deferred functions (sub-millisecond)", async () => {
		const logs = [];
		const start = Date.now();

		const example = withDefer(async (defer) => {
			for (let i = 0; i < 100; i++) {
				defer(() => {
					logs.push(i);
				});
			}
		});

		await example();
		const duration = Date.now() - start;

		expect(logs).toHaveLength(100);
		expect(duration).toBeLessThan(100); // Should complete very quickly
	});
});

describe("Performance and Stress Cases", () => {
	it("should handle deferred functions that create new deferreds (nested scenario)", async () => {
		const logs = [];
		let nestedCallCount = 0;

		const createNested = (depth) =>
			withDefer(async (defer) => {
				defer(() => {
					logs.push(`nested-${depth}`);
					nestedCallCount++;
				});

				if (depth > 0) {
					await createNested(depth - 1)();
				}
			});

		await createNested(5)();
		expect(nestedCallCount).toBe(6);
		expect(logs).toHaveLength(6);
	});

	it("should handle memory cleanup with large number of concurrent deferreds", async () => {
		const numFunctions = 50000;
		let executionCount = 0;

		const example = withDefer(async (defer) => {
			for (let i = 0; i < numFunctions; i++) {
				defer(() => {
					executionCount++;
				});
			}
		});

		await example();
		expect(executionCount).toBe(numFunctions);
	}, 30000);

	it("should handle extremely rapid deferred function execution", async () => {
		const logs = [];
		const numFunctions = 10000;
		const start = performance.now();

		const example = withDefer(async (defer) => {
			for (let i = 0; i < numFunctions; i++) {
				defer(() => {
					logs.push(i);
				});
			}
		});

		await example();
		const duration = performance.now() - start;

		expect(logs).toHaveLength(numFunctions);
		expect(duration).toBeLessThan(1000); // Should complete within 1 second
	}, 10000);

	it("should handle concurrent withDefer executions under load", async () => {
		const logs = [];
		const concurrentCount = 100;

		const createExample = (id) =>
			withDefer(async (defer) => {
				defer(async () => {
					await new Promise((resolve) =>
						setTimeout(resolve, Math.random() * 10),
					);
					logs.push(id);
				});
			});

		const promises = Array.from({ length: concurrentCount }, (_, i) =>
			createExample(i)(),
		);

		await Promise.all(promises);
		expect(logs).toHaveLength(concurrentCount);
		expect(new Set(logs).size).toBe(concurrentCount); // All unique IDs
	}, 15000);

	it("should handle circular reference scenarios safely", async () => {
		const logs = [];
		const obj1 = { name: "obj1" };
		const obj2 = { name: "obj2" };
		obj1.ref = obj2;
		obj2.ref = obj1; // Circular reference

		const example = withDefer(async (defer) => {
			defer(() => {
				logs.push(obj1.name);
			});
			defer(() => {
				logs.push(obj2.name);
			});
		});

		await example();
		expect(logs).toEqual(["obj2", "obj1"]);
	});

	it("should handle promise rejection race conditions", async () => {
		const logs = [];
		const errorReporter = vi.fn();

		const example = withDefer(
			async (defer) => {
				defer(async () => {
					await Promise.reject(new Error("Rejection test"));
				});
				defer(async () => {
					await new Promise((resolve) => setTimeout(resolve, 5));
					logs.push("completed");
				});
			},
			{ errorReporter },
		);

		await example();
		expect(logs).toEqual(["completed"]);
		expect(errorReporter).toHaveBeenCalledTimes(1);
	});

	it("should handle stack overflow prevention with deep recursion", async () => {
		const logs = [];
		let callCount = 0;

		const example = withDefer(async (defer) => {
			const recursiveFunc = (depth) => {
				if (depth > 100) return;
				defer(() => {
					callCount++;
					if (depth === 100) logs.push("max depth reached");
				});
				recursiveFunc(depth + 1);
			};
			recursiveFunc(0);
		});

		await example();
		expect(callCount).toBe(101);
		expect(logs).toEqual(["max depth reached"]);
	});
});

describe("Real-World Scenario Tests", () => {
	it("should handle database connection cleanup pattern", async () => {
		const mockConnection = {
			isConnected: false,
			connect: () => {
				mockConnection.isConnected = true;
			},
			close: () => {
				mockConnection.isConnected = false;
			},
		};
		const logs = [];

		const databaseOperation = withDefer(async (defer) => {
			mockConnection.connect();
			defer(() => {
				mockConnection.close();
				logs.push("database connection closed");
			});

			// Simulate database operations
			await new Promise((resolve) => setTimeout(resolve, 10));
			logs.push("database operation completed");
		});

		await databaseOperation();
		expect(logs).toEqual([
			"database operation completed",
			"database connection closed",
		]);
		expect(mockConnection.isConnected).toBe(false);
	});

	it("should handle file handle/stream cleanup pattern", async () => {
		const mockFileHandle = {
			isOpen: false,
			open: () => {
				mockFileHandle.isOpen = true;
			},
			close: () => {
				mockFileHandle.isOpen = false;
			},
		};
		const logs = [];

		const fileOperation = withDefer(async (defer) => {
			mockFileHandle.open();
			defer(() => {
				mockFileHandle.close();
				logs.push("file handle closed");
			});

			// Simulate file operations
			await new Promise((resolve) => setTimeout(resolve, 10));
			logs.push("file operation completed");
		});

		await fileOperation();
		expect(logs).toEqual(["file operation completed", "file handle closed"]);
		expect(mockFileHandle.isOpen).toBe(false);
	});

	it("should handle event listener removal pattern", async () => {
		const mockEventTarget = {
			listeners: new Map(),
			addEventListener: (event, listener) => {
				if (!mockEventTarget.listeners.has(event)) {
					mockEventTarget.listeners.set(event, []);
				}
				mockEventTarget.listeners.get(event).push(listener);
			},
			removeEventListener: (event, listener) => {
				const listeners = mockEventTarget.listeners.get(event);
				if (listeners) {
					const index = listeners.indexOf(listener);
					if (index > -1) {
						listeners.splice(index, 1);
					}
				}
			},
		};
		const logs = [];

		const eventOperation = withDefer(async (defer) => {
			const listener = () => logs.push("event fired");
			mockEventTarget.addEventListener("test", listener);

			defer(() => {
				mockEventTarget.removeEventListener("test", listener);
				logs.push("event listener removed");
			});

			// Simulate event-based operations
			await new Promise((resolve) => setTimeout(resolve, 10));
			logs.push("event operation completed");
		});

		await eventOperation();
		expect(logs).toEqual([
			"event operation completed",
			"event listener removed",
		]);
		expect(mockEventTarget.listeners.get("test")).toEqual([]);
	});

	it("should handle resource leak prevention with multiple resources", async () => {
		const resources = [];
		const logs = [];

		const resourceOperation = withDefer(async (defer) => {
			// Allocate multiple resources
			for (let i = 0; i < 5; i++) {
				const resource = { id: i, allocated: true };
				resources.push(resource);

				defer(() => {
					resource.allocated = false;
					logs.push(`resource ${i} deallocated`);
				});
			}

			// Simulate resource usage
			await new Promise((resolve) => setTimeout(resolve, 10));
			logs.push("resources used");
		});

		await resourceOperation();
		expect(logs).toEqual([
			"resources used",
			"resource 4 deallocated",
			"resource 3 deallocated",
			"resource 2 deallocated",
			"resource 1 deallocated",
			"resource 0 deallocated",
		]);
		expect(resources.every((r) => !r.allocated)).toBe(true);
	});

	it("should handle HTTP request cleanup with abort controller", async () => {
		const mockAbortController = {
			signal: { aborted: false },
			abort: function () {
				this.signal.aborted = true;
			},
		};
		const logs = [];

		const httpOperation = withDefer(async (defer) => {
			defer(() => {
				if (!mockAbortController.signal.aborted) {
					mockAbortController.abort();
					logs.push("request aborted");
				}
			});

			// Simulate HTTP request
			await new Promise((resolve) => setTimeout(resolve, 10));
			logs.push("request completed");
		});

		await httpOperation();
		expect(logs).toEqual(["request completed", "request aborted"]);
		expect(mockAbortController.signal.aborted).toBe(true);
	});

	it("should handle WebSocket connection cleanup", async () => {
		const mockWebSocket = {
			readyState: 1, // OPEN
			close: function () {
				this.readyState = 3;
			}, // CLOSED
		};
		const logs = [];

		const websocketOperation = withDefer(async (defer) => {
			defer(() => {
				if (mockWebSocket.readyState === 1) {
					mockWebSocket.close();
					logs.push("websocket closed");
				}
			});

			// Simulate WebSocket operations
			await new Promise((resolve) => setTimeout(resolve, 10));
			logs.push("websocket operation completed");
		});

		await websocketOperation();
		expect(logs).toEqual(["websocket operation completed", "websocket closed"]);
		expect(mockWebSocket.readyState).toBe(3);
	});
});

describe("Missing Critical Tests", () => {
	it("should capture and return primitive return values", async () => {
		const example = withDefer(async (defer) => {
			defer(() => {
				// cleanup
			});
			return 42;
		});

		const result = await example();
		expect(result).toBe(42);
	});

	it("should capture and return object return values", async () => {
		const example = withDefer(async (defer) => {
			defer(() => {
				// cleanup
			});
			return { userId: 123, name: "Alice" };
		});

		const result = await example();
		expect(result).toEqual({ userId: 123, name: "Alice" });
	});

	it("should return undefined when main function returns nothing", async () => {
		const example = withDefer(async (defer) => {
			defer(() => {
				// cleanup
			});
		});

		const result = await example();
		expect(result).toBeUndefined();
	});

	it("should handle errorReporter that throws", async () => {
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		const example = withDefer(
			async (defer) => {
				defer(() => {
					throw new Error("Deferred error");
				});
			},
			{
				errorReporter: () => {
					throw new Error("Reporter error");
				},
				debug: true,
			},
		);

		await example();

		expect(consoleSpy).toHaveBeenCalled();
		const callsAsStrings = consoleSpy.mock.calls.map((call) => String(call[0]));
		expect(
			callsAsStrings.some((call) => call.includes("Error in errorReporter")),
		).toBe(true);

		consoleSpy.mockRestore();
	});

	it("should clear timeout when callback completes before timeout fires", async () => {
		const logs = [];

		const example = withDefer(async (defer) => {
			defer(
				async () => {
					// Complete quickly, well before the timeout
					logs.push("deferred executed");
				},
				{ timeout: 5000 },
			);

			await new Promise((resolve) => setTimeout(resolve, 10));
		});

		const start = Date.now();
		await example();
		const duration = Date.now() - start;

		// Should complete quickly (not wait for 5000ms timeout)
		expect(duration).toBeLessThan(500);
		expect(logs).toEqual(["deferred executed"]);
	});

	it("should set error.cause property for wrapped errors", async () => {
		const example = withDefer(
			async (defer) => {
				defer(() => {
					throw new Error("Original error");
				});
			},
			{ throwOnError: true },
		);

		try {
			await example();
		} catch (err) {
			expect(err).toBeInstanceOf(AggregateError);
			const originalErr = err.errors[0];

			expect(originalErr.cause).toBeDefined();
			expect(originalErr.cause.message).toBe("Original error");
		}
	});

	it("should preserve original stack trace in error.stack", async () => {
		const example = withDefer(
			async (defer) => {
				defer(() => {
					throw new Error("Original error");
				});
			},
			{ throwOnError: true },
		);

		try {
			await example();
		} catch (err) {
			const wrappedError = err.errors[0];

			expect(wrappedError.stack).toContain("Caused by:");
		}
	});

	it("should handle synchronous main function", async () => {
		const example = withDefer((defer) => {
			defer(() => {
				// cleanup
			});
			return { sync: true };
		});

		const result = await example();
		expect(result).toEqual({ sync: true });
	});

	it("should await individual deferred promises", async () => {
		let deferred1Settled = false;
		let deferred2Settled = false;

		const example = withDefer(async (defer) => {
			const d1 = defer(async () => {
				await new Promise((resolve) => setTimeout(resolve, 50));
			});

			const d2 = defer(async () => {
				await new Promise((resolve) => setTimeout(resolve, 30));
			});

			d1.promise.then(() => {
				deferred1Settled = true;
			});

			d2.promise.then(() => {
				deferred2Settled = true;
			});

			await new Promise((resolve) => setTimeout(resolve, 10));
		});

		await example();

		expect(deferred1Settled).toBe(true);
		expect(deferred2Settled).toBe(true);
	});

	it("should handle timeout value of 0", async () => {
		const logs = [];

		const example = withDefer(async (defer) => {
			defer(
				async () => {
					await new Promise((resolve) => setTimeout(resolve, 10));
					logs.push("completed");
				},
				{ timeout: 0 },
			);
		});

		await example();

		expect(logs).toEqual(["completed"]);
	});

	it("should handle timeout value of -1", async () => {
		const logs = [];

		const example = withDefer(async (defer) => {
			defer(
				async () => {
					await new Promise((resolve) => setTimeout(resolve, 10));
					logs.push("completed");
				},
				{ timeout: -1 },
			);
		});

		await example();

		expect(logs).toEqual(["completed"]);
	});

	it("should not mutate original error message", async () => {
		const originalError = new Error("Original message");

		const example = withDefer(
			async (defer) => {
				defer(() => {
					throw originalError;
				});
			},
			{
				errorReporter: () => {
					// no-op
				},
			},
		);

		await example();

		expect(originalError.message).toBe("Original message");
	});

	it("should handle return value with multiple function arguments", async () => {
		const example = withDefer(async (defer, name, count) => {
			defer(() => {
				// cleanup
			});
			return `${name} × ${count}`;
		});

		const result = await example("test", 5);
		expect(result).toBe("test × 5");
	});

	it("should handle very long error messages", async () => {
		const longMessage = "x".repeat(10000);

		const example = withDefer(
			async (defer) => {
				defer(() => {
					throw new Error(longMessage);
				});
			},
			{ throwOnError: true },
		);

		try {
			await example();
		} catch (err) {
			const wrappedError = err.errors[0];
			expect(wrappedError.cause.message).toBe(longMessage);
			expect(wrappedError.cause.message.length).toBe(10000);
		}
	});

	it("should handle multiple errors with error cause chains", async () => {
		const example = withDefer(
			async (defer) => {
				defer(() => {
					throw new Error("Error 1");
				});
				defer(() => {
					throw new Error("Error 2");
				});
				defer(() => {
					throw new Error("Error 3");
				});
			},
			{ throwOnError: true },
		);

		try {
			await example();
		} catch (err) {
			expect(err).toBeInstanceOf(AggregateError);
			expect(err.errors).toHaveLength(3);

			// LIFO order: Error 3, Error 2, Error 1
			const expectedErrors = ["Error 3", "Error 2", "Error 1"];
			err.errors.forEach((wrappedErr, index) => {
				expect(wrappedErr.cause).toBeDefined();
				expect(wrappedErr.cause.message).toBe(expectedErrors[index]);
			});
		}
	});

	it("should throw error when defer is called during deferred execution", async () => {
		const example = withDefer(async (defer) => {
			defer(async () => {
				expect(() => {
					defer(() => {});
				}).toThrow("Cannot call defer() during deferred function execution");
			});
		});

		await example();
	});
});
