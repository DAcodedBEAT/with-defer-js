# [1.1.0](https://github.com/DAcodedBEAT/with-defer-js/compare/v1.0.0...v1.1.0) (2026-09-15)


### Features

* add recover(), dual CJS+ESM publish, fix concurrency bugs ([a2dda0c](https://github.com/DAcodedBEAT/with-defer-js/commit/a2dda0c8b0f17e65c772980bb6ccbe1a764204a7))

# 1.0.0 (2025-12-19)

- feat!: make production-ready with concurrent safety and automated publishing ([94cdf94](https://github.com/DAcodedBEAT/with-defer-js/commit/94cdf9489b630b7b68b5af98d205c94623046a56))

### BREAKING CHANGES

- Deferred functions now execute sequentially (LIFO) instead
  of concurrently, matching Go's defer semantics. Calling defer() during
  execution now throws an error.

* Fix concurrent safety: isolated defer stacks per invocation
* Sequential LIFO execution for Go-like behavior
* Add semantic-release for automated versioning and publishing
