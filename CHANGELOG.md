# 1.0.0 (2025-12-19)


* feat!: make production-ready with concurrent safety and automated publishing ([94cdf94](https://github.com/DAcodedBEAT/with-defer-js/commit/94cdf9489b630b7b68b5af98d205c94623046a56))


### BREAKING CHANGES

* Deferred functions now execute sequentially (LIFO) instead
of concurrently, matching Go's defer semantics. Calling defer() during
execution now throws an error.

- Fix concurrent safety: isolated defer stacks per invocation
- Sequential LIFO execution for Go-like behavior
- Add semantic-release for automated versioning and publishing
