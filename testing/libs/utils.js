function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(() => resolve(), milliseconds));
}
module.exports.sleep = sleep;

async function waitForResponse() {
  await sleep(600);
}
module.exports.waitForResponse = waitForResponse;

async function waitForServerStart() {
  await sleep(3000);
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

function is200ResponseWithExpectedContentTypeAndBody(
  response,
  expectedContentType,
  expectedBody,
  hasConnectionClose = false
) {
  const { header, body } = response;
  return (
    header.code === '200' &&
    header.version === 'HTTP/1.1' &&
    header.description === 'OK' &&
    header.keyValues['Content-Length'] === body.length.toString() &&
    header.keyValues['Content-Type'] === expectedContentType &&
    areBuffersEqual(expectedBody, body) &&
    isValidLastModifiedString(header.keyValues['Last-Modified']) &&
    (!hasConnectionClose || header.keyValues['Connection'] === 'close')
  );
}
module.exports.is200ResponseWithExpectedContentTypeAndBody = is200ResponseWithExpectedContentTypeAndBody;

function is404Response(response, hasConnectionClose = false) {
  const { header, body } = response;
  return (
    header.code === '404' &&
    header.version === 'HTTP/1.1' &&
    header.description === 'Not Found' &&
    header.keyValues['Content-Length'] === body.length.toString() &&
    header.keyValues['Content-Type'] === 'text/html' &&
    !header.keyValues['Last-Modified'] &&
    (!hasConnectionClose || header.keyValues['Connection'] === 'close')
  );
}
module.exports.is404Response = is404Response;

function is400Response(response) {
  const { header, body } = response;
  return (
    header.code === '400' &&
    header.version === 'HTTP/1.1' &&
    header.description === 'Bad Request' &&
    header.keyValues['Content-Length'] === body.length.toString() &&
    header.keyValues['Content-Type'] === 'text/html' &&
    !header.keyValues['Last-Modified'] &&
    header.keyValues['Connection'] === 'close'
  );
}
module.exports.is400Response = is400Response;

function isValidLastModifiedString(s) {
  if (!s) {
    return false;
  } else {
    const weekDayStrings = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const pattern = /^\s*(?<dayName>(Mon|Tue|Wed|Thu|Fri|Sat|Sun)), (?<date>[0-9]{2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) [0-9]{4} [0-9]{2}:[0-9]{2}:[0-9]{2} GMT)\s*$/i;

    const match = s.match(pattern);
    if (!match) {
      return false;
    } else {
      const { dayName, date: dateString } = match.groups;
      const date = new Date(dateString);
      if (isNaN(date.getTime()) || weekDayStrings[date.getDay()] !== dayName) {
        return false;
      } else {
        return true;
      }
    }
  }
}
