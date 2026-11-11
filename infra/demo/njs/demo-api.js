// Longer than anyone keeps the demo open, so the request is still pending when the report is sent.
const HANG_MILLISECONDS = 10 * 60 * 1000;

/** Holds the request open and only then gives up, like a backend that stopped responding. */
function hang(request) {
  setTimeout(() => request.return(504, ''), HANG_MILLISECONDS);
}

export default { hang };
