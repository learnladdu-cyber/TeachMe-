(function () {
  "use strict";
  var script = document.currentScript;
  if (!script || window.__hdfChatLoaded) return;
  window.__hdfChatLoaded = true;

  var key = script.getAttribute("data-key");
  if (!key) return;

  var base = new URL(script.src).origin;

  // Attribute overrides (optional) let a brand tweak a single install without
  // changing the workspace settings. Server config is the source of truth.
  var attrAccent = script.getAttribute("data-accent");
  var attrLabel = script.getAttribute("data-label");
  var attrPosition = script.getAttribute("data-position");

  var config = { accent: "#1b1533", launcherLabel: "Chat with us", position: "right" };
  if (/^#[0-9a-fA-F]{6}$/.test(attrAccent || "")) config.accent = attrAccent;
  if (attrLabel) config.launcherLabel = attrLabel;
  if (attrPosition === "left" || attrPosition === "right") config.position = attrPosition;

  function build() {
    var open = false;
    var accent = config.accent;
    var position = config.position === "left" ? "left" : "right";
    var label = config.launcherLabel || "Chat with us";

    var button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", label);
    button.setAttribute("data-hdf-chat-launcher", "");
    button.innerHTML =
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8A2.5 2.5 0 0 1 17.5 16H9l-5 4v-4.5A2.5 2.5 0 0 1 4 13.5z" ' +
      'stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>';
    button.style.cssText = [
      "position:fixed",
      "bottom:20px",
      position + ":20px",
      "width:56px",
      "height:56px",
      "border-radius:50%",
      "border:0",
      "cursor:pointer",
      "color:#fff",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "box-shadow:0 12px 30px rgba(15,10,40,.28)",
      "background:" + accent,
      "z-index:2147483000",
      "transition:transform .18s ease",
    ].join(";");

    var panel = document.createElement("div");
    panel.setAttribute("data-hdf-chat-panel", "");
    panel.style.cssText = [
      "position:fixed",
      "bottom:88px",
      position + ":20px",
      "width:380px",
      "max-width:calc(100vw - 32px)",
      "height:560px",
      "max-height:calc(100vh - 120px)",
      "border-radius:18px",
      "overflow:hidden",
      "box-shadow:0 24px 60px rgba(15,10,40,.32)",
      "background:#fff",
      "z-index:2147483000",
      "opacity:0",
      "transform:translateY(12px) scale(.98)",
      "pointer-events:none",
      "transition:opacity .2s ease, transform .2s ease",
    ].join(";");

    var iframe = document.createElement("iframe");
    iframe.src = base + "/embed/" + encodeURIComponent(key);
    iframe.title = "Support chat";
    iframe.style.cssText = "width:100%;height:100%;border:0;display:block";
    iframe.setAttribute("allow", "clipboard-write");
    panel.appendChild(iframe);

    function setOpen(next) {
      open = next;
      panel.style.opacity = open ? "1" : "0";
      panel.style.transform = open ? "translateY(0) scale(1)" : "translateY(12px) scale(.98)";
      panel.style.pointerEvents = open ? "auto" : "none";
      button.style.transform = open ? "rotate(90deg)" : "none";
    }

    button.addEventListener("click", function () {
      setOpen(!open);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && open) setOpen(false);
    });

    function mount() {
      document.body.appendChild(panel);
      document.body.appendChild(button);
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", mount);
    } else {
      mount();
    }

    // Simple public control surface for host sites.
    window.HelpDeskFlow = {
      open: function () {
        setOpen(true);
      },
      close: function () {
        setOpen(false);
      },
      toggle: function () {
        setOpen(!open);
      },
      isOpen: function () {
        return open;
      },
    };
  }

  function start() {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", base + "/api/chat/" + encodeURIComponent(key) + "/config", true);
      xhr.timeout = 5000;
      xhr.onload = function () {
        try {
          var payload = JSON.parse(xhr.responseText);
          var data = payload && payload.data ? payload.data : null;
          if (data) {
            if (data.enabled === false) return;
            if (/^#[0-9a-fA-F]{6}$/.test(data.accent || "")) config.accent = data.accent;
            if (data.launcherLabel) config.launcherLabel = data.launcherLabel;
            if (data.position === "left" || data.position === "right") config.position = data.position;
          }
        } catch (e) {
          // fall back to attribute defaults
        }
        build();
      };
      xhr.onerror = xhr.ontimeout = function () {
        build();
      };
      xhr.send();
    } catch (e) {
      build();
    }
  }

  start();
})();
