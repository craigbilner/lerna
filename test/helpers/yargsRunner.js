"use strict";

const yargs = require("yargs/yargs");
const globalOptions = require("../../src/Command").builder;

module.exports = yargsRunner;

/**
 * A higher-order function to help with passing _actual_ yargs-parsed argv
 * into command constructors (instead of artificial direct parameters).
 *
 * @param {Object} commandModule The yargs command exports
 * @return {Function} with partially-applied yargs config
 */
function yargsRunner(commandModule) {
  const cmd = commandModule.command.split(" ")[0];

  return cwd => {
    // create a _new_ yargs instance every time cwd changes to avoid singleton pollution
    const cli = yargs([], cwd)
      .options(globalOptions)
      .command(commandModule);

    return (...args) =>
      new Promise((resolve, reject) => {
        const yargsMeta = {};

        const context = {
          cwd,
          onResolved: result => {
            Object.assign(result, yargsMeta);
            resolve(result);
          },
          onRejected: result => {
            Object.assign(result, yargsMeta);
            // tests expect errors thrown to indicate failure,
            // _not_ just non-zero exitCode
            reject(result);
          },
        };

        const parseFn = (yargsError, parsedArgv, yargsOutput) => {
          Object.assign(yargsMeta, { parsedArgv, yargsOutput });
          // immediate rejection to avoid dangling promise timeout
          if (yargsError) {
            context.onRejected(yargsError);
          }
        };

        cli.parse([cmd, ...args], context, parseFn);
      });
  };
}
