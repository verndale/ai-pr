"use strict";

const { execFileSync } = require("child_process");

/**
 * @param {string} cwd
 * @returns {boolean}
 */
function isInGitRepo(cwd) {
  try {
    execFileSync("git", ["rev-parse", "--git-dir"], {
      cwd,
      encoding: "utf8",
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} cwd
 * @returns {string | null} Absolute git root, or null if not in a repo / git unavailable
 */
function getGitRoot(cwd) {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd,
      encoding: "utf8",
    }).trim();
  } catch {
    return null;
  }
}

module.exports = {
  isInGitRepo,
  getGitRoot,
};
