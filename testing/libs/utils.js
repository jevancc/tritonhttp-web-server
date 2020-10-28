function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(() => resolve(), milliseconds));
}
module.exports.sleep = sleep;


async function waitForResponse() {
  await sleep(1000);
}
module.exports.waitForResponse = waitForResponse;

async function waitForServerStart() {
  await sleep(2000);
}
module.exports.waitForServerStart = waitForServerStart;
