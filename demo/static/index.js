(async function () {
  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('start').addEventListener('click', start);
    document.getElementById('release').addEventListener('click', release);
  });

  const PLUGIN = 'janus.plugin.nosip';
  const { XHR_ENDPOINT, WS_ENDPOINT } = await import('./env.js');
  const { debug, clear } = await import('./debug.js');
  let sessionID;
  let localStream;
  let ws;
  let caller;
  let callee;

  window.addEventListener('unload', () => {
    if (sessionID) {
      navigator.sendBeacon(`${XHR_ENDPOINT}/destroy/${sessionID}/`, '');
    }
  }, false);


  async function start() {
    const { getLocalStream } = await import('./devices.js');

    clear();

    this.classList.add('hidden');
    document.getElementById('release').classList.remove('hidden');
    document.getElementById('content').classList.remove('hidden');

    localStream = await getLocalStream();
    debug('got local stream');

    document.getElementById('localV1').srcObject = localStream;
    document.getElementById('localV2').srcObject = localStream;

    // create the session

    sessionID = await fetch(`${XHR_ENDPOINT}/create`, {
      method: 'POST'
    }).then(res => res.text());

    debug(`session created ${sessionID}`);

    ws = new WebSocket(`${WS_ENDPOINT}/${sessionID}`);
    ws.addEventListener('message', async (event) => {
      debug(`ws message\n${event.data}`);
      try {
        const { type, data } = JSON.parse(event.data);
        const { sender } = data;

        switch (type) {
          case 'trickle': {
            const peer = caller.handleID === sender ? caller : callee;
            if (data.candidate && data.candidate.candidate) {
              await peer.addIceCandidate(data.candidate);
            }
            break;
          }
          case 'event': {
            const result = data.plugindata.data.result;
            if (result.event === 'generated') {
              if (result.type === 'offer') {
                await callee.processOffer({
                  type: result.type,
                  sdp: result.sdp
                });
              } else {
                await caller.processAnswer({
                  type: result.type,
                  sdp: result.sdp
                });
              }
            } else if (result.event === 'processed') {
              const { jsep } = data;
              if (jsep.type === 'offer') {
                await callee.setOffer(jsep);
              } else {
                await caller.setAnswer(jsep);
              }
            }
            break;
          }
          case 'webrtcup': {
            break;
          }
          case 'media': {
            break;
          }
          default: {

          }
        }
      } catch (err) {
        debug(`ERR: ${err.message}`);
      }
    });

    const { createCaller, createCallee } = await import('./peer.js');

    caller = await createCaller(PLUGIN, sessionID, localStream);
    callee = await createCallee(PLUGIN, sessionID, localStream);

    caller.addEventListener('connected', () => {
      debug('caller connected');
      document.getElementById('remoteV1').srcObject = caller.stream;
    });

    callee.addEventListener('connected', () => {
      debug('callee connected');
      document.getElementById('remoteV2').srcObject = callee.stream;
    });

    await caller.createOffer();
  }

  async function release() {
    localStream && localStream.getTracks().forEach((t) => t.stop());
    this.classList.add('hidden');
    document.getElementById('start').classList.remove('hidden');
    document.getElementById('content').classList.add('hidden');

    await caller.hangup();
    await callee.hangup();

    ws.close();

    await fetch(`${XHR_ENDPOINT}/destroy/${sessionID}/`, {
      method: 'POST'
    });
    debug('destroy session');
  }
})();