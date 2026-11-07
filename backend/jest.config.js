module.exports = {
  testEnvironment: "node",
  collectCoverageFrom: ["controller/**/*.js", "middleware/**/*.js"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  coverageThreshold: {
    global: { statements: 80, branches: 80, functions: 80, lines: 80 },
  },
};