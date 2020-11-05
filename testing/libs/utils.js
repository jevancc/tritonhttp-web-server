function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(() => resolve(), milliseconds));
}
module.exports.sleep = sleep;


async function waitForResponse() {
  await sleep(600);
}
module.exports.waitForResponse = waitForResponse;

async function waitForServerStart() {
  await sleep(2000);
}
module.exports.waitForServerStart = waitForServerStart;


async function waitForServerTimeout() {
  await sleep(7000);
}
module.exports.waitForServerTimeout = waitForServerTimeout;

async function waitForNextRequest() {
  await sleep(1000);
}
module.exports.waitForNextRequest = waitForNextRequest;

async function waitForBigResponse() {
  await sleep(2000);
}
module.exports.waitForBigResponse = waitForBigResponse;

function areBuffersEqual(bufA, bufB) {
  const len = bufA.length;
  if (len !== bufB.length) {
    return false;
  }
  for (let i = 0; i < len; i++) {
    if (bufA.readUInt8(i) !== bufB.readUInt8(i)) {
      return false;
    }
  }
  return true;
}
module.exports.areBuffersEqual = areBuffersEqual;
