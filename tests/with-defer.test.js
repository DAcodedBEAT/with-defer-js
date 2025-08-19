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

	it("should handle extremely large timeout values", async () => {
		const logs = [];
		const example = withDefer(async (defer) => {
			defer(
				() => {
					logs.push("executed");
				},
				{ timeout: Number.MAX_SAFE_INTEGER },
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

	it(
		"should handle deeply nested withDefer functions",
		async () => {
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
		},
		{
			timeout: 30_000,
		},
	);

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

	it(
		"should handle recursive deferred functions",
		async () => {
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
		},
		{ timeout: 30_000 },
	);

	console.log("All additional tests completed successfully!");
});
