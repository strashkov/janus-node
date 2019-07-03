export async function createCaller(plugin, ...args) {
  const peer = new Caller(...args);
  await peer.attach(plugin);
  return peer;
}
export async function createCallee(plugin, ...args) {
  const peer = new Callee(...args);
  await peer.attach(plugin);
  return peer;
}

class Peer extends EventTarget {
  constructor(sessionID, stream) {
    super();
    this.sessionID = sessionID;
    this.connection = new RTCPeerConnection({});
    this.connection.addStream(stream);
    this.connection.addEventListener('icecandidate', ({ candidate }) => {
      if (candidate) {
        this.request('trickle', {
          candidate: {
            candidate: candidate.candidate,
            sdpMLineIndex: candidate.sdpMLineIndex,
            sdpMid: candidate.sdpMid
          }
        });
      } else {
        this.request('trickle', {
          candidate: {
            completed: true
          }
        });
      }
    });
    this.connection.addEventListener('track', () => {
      const stream = new MediaStream();
      this.connection.getReceivers().forEach((receiver) => {
        if (receiver.track) {
          stream.addTrack(receiver.track);
        }
      });
      if (stream.getTracks().length) {
        this.stream = stream;
      }
    });
    this.connection.addEventListener('connectionstatechange', () => {
      if (this.connection.connectionState === 'connected') {
        this.dispatchEvent(new Event('connected'));
      }
    });
    this.pendingCandidates = new Set();
  }
  async addIceCandidate(candidate) {
    if (this.connection.remoteDescription && this.connection.remoteDescription.sdp) {
      await this.connection.addIceCandidate(new RTCIceCandidate(candidate));
    } else{
      this.pendingCandidates.add(candidate);
    }
  }
  async processRemoteCandidates() {
    if (this.pendingCandidates.size) {
      for (const candidate of this.pendingCandidates) {
        if (candidate.candidate) {
          await this.connection.addIceCandidate(new RTCIceCandidate(candidate));
        }
        this.pendingCandidates.delete(candidate);
      }
    }
  }
  async attach(plugin) {
    const response = await this.request('attach', {
      plugin
    });
    if (response) {
      this.handleID = parseInt(response, 10);
    }
  }
  async hangup() {
    this.connection.close();
    await this.request('hangup');
  }
  async request(type, data) {
    const { XHR_ENDPOINT } = await import('./env.js');
    const { debug } = await import('./debug.js');
    const path = `/session/${this.sessionID}/${type}`;

    let body;

    if (this.handleID) {
      body = Object.assign({
        handle_id: this.handleID
      }, data || {})
    } else {
      body = data;
    }

    body = JSON.stringify(body);

    debug(`request\n${path}\n${body}`);

    const response = await fetch(`${XHR_ENDPOINT}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body
    }).then(res => res.text());

    debug(`response\n${path}\n${response}`);

    return response;
  }
}

class Caller extends Peer {
  constructor(...args) {
    super(...args);
  }
  async createOffer() {
    const offer = await this.connection.createOffer();
    await this.connection.setLocalDescription(offer);
    await this.request('message', {
      body: {
        request: 'generate'
      },
      jsep: {
        type: offer.type,
        sdp: offer.sdp
      }
    });
  }
  async setAnswer(answer) {
    await this.connection.setRemoteDescription(new RTCSessionDescription(answer));
    await this.processRemoteCandidates();
  }
  async processAnswer(answer) {
    await this.request('message', {
      body: {
        request: 'process',
        type: answer.type,
        sdp: answer.sdp
      }
    });
  }
}

class Callee extends Peer {
  constructor(...args) {
    super(...args);
  }
  async setOffer(offer) {
    await this.connection.setRemoteDescription(new RTCSessionDescription(offer));
    await this.processRemoteCandidates();
    const answer = await this.connection.createAnswer();
    await this.connection.setLocalDescription(answer);
    await this.request('message', {
      body: {
        request: 'generate'
      },
      jsep: {
        type: answer.type,
        sdp: answer.sdp
      }
    });
  }
  async processOffer(offer) {
    await this.request('message', {
      body: {
        request: 'process',
        type: offer.type,
        sdp: offer.sdp
      }
    });
  }
}
