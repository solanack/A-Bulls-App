function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function compact(value, size = 5) {
  const text = String(value || "");
  return text.length > size * 2 + 1
    ? `${text.slice(0, size)} ${text.slice(-size)}`
    : text;
}

function firstArray(...values) {
  return values.find(Array.isArray) || [];
}

function narrationFor(query, resolved, index) {
  const entity =
    resolved?.entity ||
    resolved?.resolved ||
    resolved?.result ||
    resolved ||
    {};
  const kind = String(
    entity.kind || entity.type || entity.entityKind || "chain entity",
  ).replaceAll("-", " ");
  const owner = entity.ownerLabel || entity.ownerProgram || entity.owner || "";
  const balance = Number(
    entity.solBalance ?? entity.balanceSol ?? entity.lamports / 1e9,
  );
  const tokens = firstArray(
    index?.tokens,
    index?.items,
    index?.holdings,
    index?.rows,
  );
  const coverage = index?.coverage || index?.disclosure || index?.status || "";
  const parts = [`Signal acquired. ${compact(query)} resolves as ${kind}.`];
  if (Number.isFinite(balance))
    parts.push(
      `Observed balance is ${balance.toLocaleString(undefined, { maximumFractionDigits: 4 })} S O L.`,
    );
  if (owner)
    parts.push(`Owner signature: ${String(owner).replaceAll("_", " ")}.`);
  if (tokens.length)
    parts.push(
      `The indexed field contains ${tokens.length} token position${tokens.length === 1 ? "" : "s"}.`,
    );
  else if (index)
    parts.push(
      "No indexed token positions are visible in the current coverage window.",
    );
  if (/queue|pending|partial/i.test(String(coverage)))
    parts.push("The deeper index is still forming; this reading is partial.");
  parts.push("Read-only scan complete.");
  return parts.join(" ");
}

class AlienVoice {
  #context = null;
  #drone = null;
  #gain = null;
  #pulse = 0;

  unlock() {
    const AudioContext =
      globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContext) return;
    this.#context ||= new AudioContext();
    void this.#context.resume?.();
  }

  stop() {
    globalThis.speechSynthesis?.cancel();
    clearInterval(this.#pulse);
    this.#pulse = 0;
    if (this.#gain && this.#context) {
      this.#gain.gain.cancelScheduledValues(this.#context.currentTime);
      this.#gain.gain.setTargetAtTime(0, this.#context.currentTime, 0.035);
    }
    globalThis.dispatchEvent(
      new CustomEvent("abulls:query-speech", {
        detail: { active: false, level: 0 },
      }),
    );
  }

  speak(text) {
    this.stop();
    const synth = globalThis.speechSynthesis;
    if (!synth || !text) return;
    this.unlock();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = synth.getVoices();
    utterance.voice =
      voices.find((voice) =>
        /daniel|male|english.*us|google us/i.test(
          `${voice.name} ${voice.lang}`,
        ),
      ) ||
      voices.find((voice) => /^en/i.test(voice.lang)) ||
      null;
    utterance.pitch = 0.32;
    utterance.rate = 0.76;
    utterance.volume = 0.92;
    utterance.onstart = () => {
      this.#startDrone();
      globalThis.dispatchEvent(
        new CustomEvent("abulls:query-speech", {
          detail: { active: true, level: 0.45 },
        }),
      );
      let phase = 0;
      this.#pulse = setInterval(() => {
        phase += 1;
        const level = 0.24 + Math.abs(Math.sin(phase * 1.73)) * 0.62;
        globalThis.dispatchEvent(
          new CustomEvent("abulls:query-speech", {
            detail: { active: true, level },
          }),
        );
      }, 92);
    };
    utterance.onend = () => this.stop();
    utterance.onerror = () => this.stop();
    synth.speak(utterance);
  }

  #startDrone() {
    if (!this.#context) return;
    const now = this.#context.currentTime;
    if (!this.#drone) {
      const oscillator = this.#context.createOscillator();
      const tremolo = this.#context.createOscillator();
      const tremoloGain = this.#context.createGain();
      const gain = this.#context.createGain();
      oscillator.type = "sawtooth";
      oscillator.frequency.value = 43;
      tremolo.type = "sine";
      tremolo.frequency.value = 7.4;
      tremoloGain.gain.value = 0.012;
      gain.gain.value = 0;
      tremolo.connect(tremoloGain).connect(gain.gain);
      oscillator.connect(gain).connect(this.#context.destination);
      oscillator.start();
      tremolo.start();
      this.#drone = oscillator;
      this.#gain = gain;
    }
    this.#gain.gain.cancelScheduledValues(now);
    this.#gain.gain.setTargetAtTime(0.018, now, 0.08);
  }
}

export class QueryExperience {
  #host;
  #root = null;
  #input = null;
  #apiBase;
  #controller = null;
  #voice = new AlienVoice();
  #onExit;
  #onKeyDown = (event) => {
    if (event.key === "Escape") this.#onExit?.();
  };

  constructor({ host, apiBase = "", onExit } = {}) {
    if (!(host instanceof Element))
      throw new TypeError("host element is required");
    this.#host = host;
    this.#apiBase = String(apiBase || location.origin).replace(/\/$/, "");
    this.#onExit = typeof onExit === "function" ? onExit : null;
  }

  open() {
    this.#voice.unlock();
    if (this.#root) {
      this.#input?.focus();
      return;
    }
    const root = el("div", "query-experience");
    const form = el("form", "query-experience__form");
    const input = document.createElement("input");
    input.type = "search";
    input.autocomplete = "off";
    input.autocapitalize = "none";
    input.spellcheck = false;
    input.placeholder = "Enter a Solana address";
    input.setAttribute("aria-label", input.placeholder);
    form.append(input);
    root.append(form);
    this.#host.append(root);
    this.#root = root;
    this.#input = input;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void this.#query(input.value.trim());
    });
    form.addEventListener("click", (event) => event.stopPropagation());
    root.addEventListener("click", () => this.#onExit?.());
    globalThis.addEventListener("keydown", this.#onKeyDown);
    globalThis.__ABULLS_QUERY_ACTIVE = true;
    globalThis.dispatchEvent(
      new CustomEvent("abulls:query-state", { detail: { active: true } }),
    );
    requestAnimationFrame(() => {
      root.classList.add("is-active");
      input.focus({ preventScroll: true });
    });
  }

  async #query(value) {
    if (!value || !this.#input) return;
    this.#controller?.abort();
    this.#controller = new AbortController();
    this.#input.disabled = true;
    this.#input.placeholder = "Reading the field…";
    globalThis.dispatchEvent(
      new CustomEvent("abulls:query-phase", { detail: { phase: "reading" } }),
    );
    try {
      const response = await fetch(
        `${this.#apiBase}/api/intelligence/resolve?query=${encodeURIComponent(value)}`,
        {
          headers: { accept: "application/json" },
          cache: "no-store",
          signal: this.#controller.signal,
        },
      );
      const resolved = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(resolved?.error || `http_${response.status}`);
      let index = null;
      if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) {
        const indexResponse = await fetch(
          `${this.#apiBase}/api/intelligence/wallet-tokens?wallet=${encodeURIComponent(value)}&limit=100`,
          {
            headers: { accept: "application/json" },
            cache: "no-store",
            signal: this.#controller.signal,
          },
        );
        if (indexResponse.ok) {
          const body = await indexResponse.json().catch(() => ({}));
          index = body.index || body;
        }
      }
      this.#voice.speak(narrationFor(value, resolved, index));
      globalThis.dispatchEvent(
        new CustomEvent("abulls:query-phase", {
          detail: { phase: "speaking", resolved, index },
        }),
      );
    } catch (error) {
      if (error?.name !== "AbortError")
        this.#voice.speak(
          "The signal could not be resolved. Verify the address and try again.",
        );
    } finally {
      if (this.#input) {
        this.#input.disabled = false;
        this.#input.placeholder = "Enter another Solana address";
        this.#input.focus({ preventScroll: true });
      }
    }
  }

  close() {
    if (!this.#root) return;
    this.#controller?.abort();
    this.#voice.stop();
    const root = this.#root;
    this.#root = null;
    this.#input = null;
    globalThis.removeEventListener("keydown", this.#onKeyDown);
    globalThis.__ABULLS_QUERY_ACTIVE = false;
    globalThis.dispatchEvent(
      new CustomEvent("abulls:query-state", { detail: { active: false } }),
    );
    root.classList.remove("is-active");
    setTimeout(() => root.remove(), 240);
  }

  destroy() {
    this.close();
  }
}
