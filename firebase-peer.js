/* Firebase-backed WebRTC signaling adapter for BLACK MAFIA.
 * This replaces the public PeerJS signaling server; media remains WebRTC.
 */
(function () {
  'use strict';
  const BASE = String(window.MAFIA_DB_URL || '/api/db').replace(/\/$/, '');
  const now = () => Date.now();
  const safe = s => String(s || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80);
  const wait = ms => new Promise(r => setTimeout(r, ms));

  class Events {
    constructor() { this.events = Object.create(null); }
    on(name, fn) { (this.events[name] ||= []).push(fn); return this; }
    off(name, fn) { this.events[name] = (this.events[name] || []).filter(x => x !== fn); return this; }
    emit(name, value) { (this.events[name] || []).slice().forEach(fn => { try { fn(value); } catch (e) { console.error(e); } }); }
  }

  async function db(path, method, value) {
    const response = await fetch(BASE + '/' + path + '.json', {
      method: method || 'GET',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: value === undefined ? undefined : JSON.stringify(value),
      cache: 'no-store'
    });
    if (!response.ok) {
      const err = new Error('Firebase signaling HTTP ' + response.status);
      err.type = response.status >= 500 ? 'server-error' : 'network';
      throw err;
    }
    if (response.status === 204) return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  class Session extends Events {
    constructor(peer, remote, sid, kind, incoming) {
      super();
      this.peer = peer; this.peerId = remote; this.sid = sid; this.kind = kind;
      this.incoming = incoming; this.open = false; this.closed = false;
      this.pc = new RTCPeerConnection({ iceServers: peer.iceServers });
      this.remoteCandidates = [];
      this.remoteReady = new Promise(resolve => { this._remoteReady = resolve; });
      this.stream = new MediaStream();
      this.pc.onicecandidate = e => {
        if (e.candidate && !this.closed) this.peer._signal(this.peerId, {
          type: 'candidate', kind: this.kind, sid: this.sid, candidate: e.candidate
        }).catch(() => {});
      };
      this.pc.ontrack = e => {
        const stream = e.streams && e.streams[0];
        if (stream) {
          if (!this._streamSent) { this._streamSent = true; this.emit('stream', stream); }
        } else {
          if (!this.stream.getTracks().some(t => t.id === e.track.id)) this.stream.addTrack(e.track);
          if (!this._streamSent) { this._streamSent = true; this.emit('stream', this.stream); }
        }
      };
      this.pc.onconnectionstatechange = () => {
        if (this.pc.connectionState === 'failed' || this.pc.connectionState === 'closed') this._finish(false);
      };
      this.pc.oniceconnectionstatechange = () => {
        if (this.pc.iceConnectionState === 'failed' && this.pc.connectionState !== 'connected') {
          this.emit('error', new Error('WebRTC ICE connection failed'));
        }
      };
      if (kind === 'conn') {
        this.channel = null;
        this.pc.ondatachannel = e => this._setChannel(e.channel);
        if (!incoming) this._setChannel(this.pc.createDataChannel('mafia-data', { ordered: true }));
      }
    }
    _setChannel(ch) {
      this.channel = ch;
      ch.onopen = () => { if (!this.closed) { this.open = true; this.emit('open'); } };
      ch.onmessage = e => {
        let d = e.data;
        try { d = JSON.parse(d); } catch (_) {}
        this.emit('data', d);
      };
      ch.onclose = () => this._finish(false);
      ch.onerror = e => this.emit('error', e);
    }
    send(data) {
      if (this.channel && this.channel.readyState === 'open') {
        try { this.channel.send(JSON.stringify(data)); } catch (e) { this.emit('error', e); }
      }
    }
    async _flushCandidates() {
      const q = this.remoteCandidates.splice(0);
      for (const c of q) { try { await this.pc.addIceCandidate(new RTCIceCandidate(c)); } catch (_) {} }
    }
    async _candidate(c) {
      if (!c || this.closed) return;
      if (!this.pc.remoteDescription) this.remoteCandidates.push(c);
      else { try { await this.pc.addIceCandidate(new RTCIceCandidate(c)); } catch (_) {} }
    }
    async _acceptOffer(sdp) {
      try {
        await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
        this._remoteReady();
        await this._flushCandidates();
        if (this.kind === 'conn') {
          const answer = await this.pc.createAnswer();
          await this.pc.setLocalDescription(answer);
          await this.peer._signal(this.peerId, { type: 'answer', kind: this.kind, sid: this.sid, sdp: this.pc.localDescription });
        }
      } catch (e) { this.emit('error', e); this._finish(false); }
    }
    async answer(stream) {
      if (this.kind !== 'call' || this.closed) return;
      try {
        await this.remoteReady;
        if (stream) stream.getTracks().forEach(track => this.pc.addTrack(track, stream));
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        await this.peer._signal(this.peerId, { type: 'answer', kind: this.kind, sid: this.sid, sdp: this.pc.localDescription });
      } catch (e) { this.emit('error', e); this._finish(false); }
    }
    async _startOffer(stream) {
      try {
        if (this.kind === 'call' && stream) stream.getTracks().forEach(track => this.pc.addTrack(track, stream));
        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);
        await this.peer._signal(this.peerId, { type: 'offer', kind: this.kind, sid: this.sid, sdp: this.pc.localDescription });
      } catch (e) { this.emit('error', e); this._finish(false); }
    }
    async _acceptAnswer(sdp) {
      try {
        await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
        this._remoteReady();
        await this._flushCandidates();
      } catch (e) { this.emit('error', e); this._finish(false); }
    }
    _finish(sendClose) {
      if (this.closed) return;
      this.closed = true;
      if (sendClose) this.peer._signal(this.peerId, { type: 'close', kind: this.kind, sid: this.sid }).catch(() => {});
      try { this.pc.close(); } catch (_) {}
      try { if (this.channel) this.channel.close(); } catch (_) {}
      this.emit('close');
      this.peer.sessions.delete(this.sid);
    }
    close() { this._finish(true); }
  }

  class FirebasePeer extends Events {
    constructor(id, options) {
      super();
      this.id = String(id || '');
      this.destroyed = false;
      this.options = options || {};
      this.iceServers = this.options.config && this.options.config.iceServers || [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ];
      this.room = this.id.replace(/-\d+$/, '');
      this.root = 'voiceSignals/' + safe(this.room) + '/' + safe(this.id);
      this.owner = Math.random().toString(36).slice(2) + now().toString(36);
      this.sessions = new Map();
      this.pendingCandidates = new Map();
      this.seen = new Set();
      this.pollBusy = false;
      this._start();
    }
    async _start() {
      try {
        if (!this.id || !/-\d+$/.test(this.id)) throw Object.assign(new Error('Invalid peer ID'), { type: 'server-error' });
        const path = this.root + '/presence';
        const old = await db(path);
        if (old && Number(old.expires || 0) > now()) {
          this.emit('error', Object.assign(new Error('ID already in use'), { type: 'unavailable-id' }));
          return;
        }
        await db(path, 'PUT', { owner: this.owner, expires: now() + 20000 });
        await wait(150);
        const verify = await db(path);
        if (!verify || verify.owner !== this.owner) {
          this.emit('error', Object.assign(new Error('ID already in use'), { type: 'unavailable-id' }));
          return;
        }
        if (this.destroyed) return;
        this.pollTimer = setInterval(() => this._poll(), 850);
        this.heartbeatTimer = setInterval(() => this._heartbeat(), 6000);
        this.emit('open', this.id);
        this._poll();
      } catch (e) {
        if (!this.destroyed) this.emit('error', Object.assign(e, { type: e.type || 'network' }));
      }
    }
    async _heartbeat() {
      if (this.destroyed) return;
      try {
        const p = await db(this.root + '/presence');
        if (p && p.owner === this.owner) await db(this.root + '/presence', 'PUT', { owner: this.owner, expires: now() + 20000 });
      } catch (_) {}
    }
    async _signal(remote, message) {
      if (this.destroyed) return;
      const targetRoot = 'voiceSignals/' + safe(this.room) + '/' + safe(remote);
      const presence = await db(targetRoot + '/presence');
      if (!presence || Number(presence.expires || 0) <= now()) return;
      await db(targetRoot + '/messages', 'POST', Object.assign({ from: this.id, sentAt: now() }, message));
    }
    async _poll() {
      if (this.destroyed || this.pollBusy) return;
      this.pollBusy = true;
      try {
        const messages = await db(this.root + '/messages');
        if (messages && typeof messages === 'object') {
          for (const [key, msg] of Object.entries(messages)) {
            if (this.destroyed) break;
            if (!msg || this.seen.has(key)) continue;
            this.seen.add(key);
            try { await this._receive(msg); } catch (e) { console.warn('Voice signal ignored', e); }
            try { await db(this.root + '/messages/' + safe(key), 'DELETE'); } catch (_) {}
            if (this.seen.size > 500) this.seen.clear();
          }
        }
      } catch (_) {
        // Polling is retried automatically; a transient database failure must not stop the voice client.
      } finally { this.pollBusy = false; }
    }
    async _receive(msg) {
      if (!msg || typeof msg !== 'object' || typeof msg.from !== 'string') return;
      const sid = String(msg.sid || '');
      if (msg.type === 'offer' && sid && !this.sessions.has(sid)) {
        const kind = msg.kind === 'call' ? 'call' : 'conn';
        const session = new Session(this, msg.from, sid, kind, true);
        this.sessions.set(sid, session);
        this.emit(kind === 'call' ? 'call' : 'connection', session);
        await session._acceptOffer(msg.sdp);
        const pending = this.pendingCandidates.get(sid) || [];
        this.pendingCandidates.delete(sid);
        for (const candidate of pending) await session._candidate(candidate);
        return;
      }
      const session = this.sessions.get(sid);
      if (!session) {
        if (msg.type === 'candidate' && sid && msg.candidate) {
          const list = this.pendingCandidates.get(sid) || [];
          if (list.length < 64) list.push(msg.candidate);
          this.pendingCandidates.set(sid, list);
        }
        return;
      }
      if (msg.type === 'answer') await session._acceptAnswer(msg.sdp);
      else if (msg.type === 'candidate') await session._candidate(msg.candidate);
      else if (msg.type === 'close') session._finish(false);
    }
    connect(remote, options) {
      const s = new Session(this, String(remote), this.owner + '-' + Math.random().toString(36).slice(2), 'conn', false);
      this.sessions.set(s.sid, s);
      s._startOffer();
      return s;
    }
    call(remote, stream) {
      const s = new Session(this, String(remote), this.owner + '-' + Math.random().toString(36).slice(2), 'call', false);
      this.sessions.set(s.sid, s);
      s._startOffer(stream);
      return s;
    }
    reconnect() { if (!this.destroyed) this._poll(); }
    async destroy() {
      if (this.destroyed) return;
      this.destroyed = true;
      clearInterval(this.pollTimer); clearInterval(this.heartbeatTimer);
      this.sessions.forEach(s => s._finish(false));
      try {
        const p = await db(this.root + '/presence');
        if (p && p.owner === this.owner) await db(this.root + '/presence', 'DELETE');
      } catch (_) {}
      this.emit('close');
    }
  }

  window.FirebasePeer = FirebasePeer;
  window.Peer = FirebasePeer;
})();